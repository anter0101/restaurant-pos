import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, Repository } from 'typeorm';
import { ShiftManagement } from './shift-management.entity';
import { EndShiftDTO, OpenShiftDTO } from './dtos/shift-management.dto';
import { ShiftStatus } from 'src/core/enums/shift-status';
import { OrderStatus } from 'src/core/enums/order-status';
import { UserRole } from 'src/core/enums/user-role';
import { Branch } from '../branch/branch.entity';
import { User } from '../user/user.entity';
import { Order } from '../order/order.entity';
import { resetOrderQueueCounter } from 'src/core/utils/order-queue.util';
import { roundMoney } from 'src/core/utils/order-totals.util';
import { UserDTO } from '../user/dtos/user.dto';
@Injectable()
export class ShiftManagementService {
  constructor(
    @InjectRepository(ShiftManagement)
    private readonly shiftRepository: Repository<ShiftManagement>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findById(id: number): Promise<ShiftManagement | undefined> {
    const result = await this.shiftRepository.findOne({
      where: { id },
      relations: ['branch', 'cashier'],
    });
    return result ?? undefined;
  }

  async findAndCount(
    options: FindManyOptions<ShiftManagement>,
  ): Promise<[ShiftManagement[], number]> {
    return this.shiftRepository.findAndCount(options);
  }

  async findOpenShiftForCashier(
    cashierId: number,
    branchId: number,
  ): Promise<ShiftManagement | undefined> {
    const result = await this.shiftRepository.findOne({
      where: {
        cashier: { id: cashierId },
        branch: { id: branchId },
        status: ShiftStatus.OPEN,
      },
      relations: ['branch', 'cashier'],
    });
    return result ?? undefined;
  }

  async openShift( cashier: User,manager: User, creator?: string): Promise<ShiftManagement> {
    const managerUser = await this.userRepository.findOne({
      where: { id:  manager.id},
      relations: ['branch'],
    });
    if (!managerUser) {
      throw new NotFoundException(`Manager user ${manager.id} not found`);
    }
    if (managerUser.role !== UserRole.MANAGER) {
      throw new BadRequestException(
        `User ${manager.id} is not a manager`,
      );
    }

    const cashierUser = await this.userRepository.findOne({
      where: { id:  cashier.id},
      relations: ['branch'],
    });
    if (!cashierUser) {
      throw new NotFoundException(`Cashier user ${cashier.id} not found`);
    }
    if (cashierUser.role !== UserRole.CASHIER) {
      throw new BadRequestException(
        `User ${cashier.id} is not a cashier`,
      );
    } 

    const branch = cashierUser.branch;
    if (!branch) {
      throw new BadRequestException(
        `Cashier user ${cashier.id} is not assigned to a branch`,
      );
    }

    

    const openShift = await this.shiftRepository.findOne({
      where: {
        branch: { id: branch.id },
        cashier: { id: cashierUser.id },
        status: ShiftStatus.OPEN,
      },
    });
    if (openShift) {
      throw new BadRequestException(
        `Cashier ${cashierUser.id} already has an open shift at branch ${branch.id}`,
      );
    }

    const shift = this.shiftRepository.create({
      branch,
      cashier,
      startShift: new Date(),
      status: ShiftStatus.OPEN,
      createdBy: creator,
      updatedBy: creator,
    });

    branch.nextOrderQueue = resetOrderQueueCounter();
    await this.branchRepository.save(branch);

    return this.shiftRepository.save(shift);
  }

  async endShift(
    cashier: User,
    manager: User,
  ): Promise<ShiftManagement> {

    const managerUser = await this.userRepository.findOne({
      where: { id:  manager.id},
      relations: ['branch'],
    });
    if (!managerUser) {
      throw new NotFoundException(`Manager user ${manager.id} not found`);
    }
    if (managerUser.role !== UserRole.MANAGER) {
      throw new BadRequestException(
        `User ${manager.id} is not a manager`,
      );
    }

    const cashierUser = await this.userRepository.findOne({
      where: { id:  cashier.id},
      relations: ['branch'],
    });
    if (!cashierUser) {
      throw new NotFoundException(`Cashier user ${cashier.id} not found`);
    }
    if (cashierUser.role !== UserRole.CASHIER) {
      throw new BadRequestException(
        `User ${cashier.id} is not a cashier`,
      );
    }
      const shift = await this.shiftRepository.findOne({
      where: {
        branch: { id: cashierUser.branch?.id },
        cashier: { id: cashierUser.id },
        status: ShiftStatus.OPEN,
      },
    });
    if (!shift) {
      throw new NotFoundException(`Cashier ${cashierUser.id} does not have an open shift`);
    }

    shift.status = ShiftStatus.CLOSED;
    shift.endShift = new Date();
    return this.shiftRepository.save(shift);
  }

  async hasOpenShift(dto: UserDTO): Promise<boolean> {
    const shift = await this.shiftRepository.findOne({
      where: {
        branch: { id: dto.branch?.id },
        cashier: { id: dto.id },
        status: ShiftStatus.OPEN,
      },
    });
    return shift ? true : false;
  }

  /**
   * Admin-only: sums prepared order totals into actualEndMoney, marks the shift calculated,
   * and batch-updates linked prepared orders to SHIFT_CALCULATED inside one transaction.
   */
  async calculateOrdersTotals(id: number, creator?: string): Promise<number> {
    return this.shiftRepository.manager.transaction(async (manager) => {
      const shiftRepo = manager.getRepository(ShiftManagement);
      const orderRepo = manager.getRepository(Order);

      const shift = await shiftRepo.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!shift) {
        throw new NotFoundException('Shift not found');
      }
      if (shift.status === ShiftStatus.CALCULATED) {
        throw new BadRequestException('Shift has already been calculated');
      }
      if (shift.status !== ShiftStatus.CLOSED) {
        throw new BadRequestException(
          'Shift must be closed before calculating totals',
        );
      }

      const aggregate = await orderRepo
        .createQueryBuilder('order')
        .select('COALESCE(SUM(order.total_amount), 0)', 'total')
        .addSelect('COUNT(order.id)', 'count')
        .where('order.shift_management_id = :shiftId', { shiftId: id })
        .andWhere('order.status = :status', { status: OrderStatus.PREPARED })
        .getRawOne<{ total: string; count: string }>();

      const actualEndMoney = roundMoney(Number(aggregate?.total ?? 0));
      const totalOrders = Number(aggregate?.count ?? 0);

      await orderRepo
        .createQueryBuilder()
        .update(Order)
        .set({
          status: OrderStatus.SHIFT_CALCULATED,
          updatedBy: creator,
        })
        .where('shift_management_id = :shiftId', { shiftId: id })
        .andWhere('status = :status', { status: OrderStatus.PREPARED })
        .execute();

      shift.status = ShiftStatus.CALCULATED;
      shift.actualEndMoney = actualEndMoney;
      shift.totalOrders = totalOrders;
      shift.updatedBy = creator;
      await shiftRepo.save(shift);

      return actualEndMoney;
    });
  }
}
