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

  async openShift(dto: OpenShiftDTO, creator?: string): Promise<ShiftManagement> {
    const cashier = await this.userRepository.findOne({
      where: { id: dto.cashierId },
      relations: ['branch'],
    });
    if (!cashier) {
      throw new NotFoundException(`Cashier ${dto.cashierId} not found`);
    }
    if (cashier.role !== UserRole.CASHIER) {
      throw new BadRequestException(
        `User ${dto.cashierId} is not a cashier`,
      );
    }

    const branchId = cashier.branch?.id;
    if (!branchId) {
      throw new BadRequestException(
        `Cashier ${dto.cashierId} is not assigned to a branch`,
      );
    }

    const branch = await this.branchRepository.findOne({
      where: { id: branchId },
    });
    if (!branch) {
      throw new NotFoundException(`Branch ${branchId} not found`);
    }

    const openShift = await this.shiftRepository.findOne({
      where: {
        branch: { id: branchId },
        cashier: { id: dto.cashierId },
        status: ShiftStatus.OPEN,
      },
    });
    if (openShift) {
      throw new BadRequestException(
        `Cashier ${dto.cashierId} already has an open shift at branch ${branchId}`,
      );
    }

    const shift = this.shiftRepository.create({
      branch,
      cashier,
      startShift: new Date(),
      status: ShiftStatus.OPEN,
      notes: dto.notes,
      createdBy: creator,
      updatedBy: creator,
    });

    branch.nextOrderQueue = resetOrderQueueCounter();
    await this.branchRepository.save(branch);

    return this.shiftRepository.save(shift);
  }

  /**
   * Closes a shift, records end-of-day cash, sums prepared order totals into actualEndMoney,
   * and moves linked prepared orders to shift_calculated.
   */
  async endShift(
    shiftId: number,
    dto: EndShiftDTO,
    updater?: string,
  ): Promise<ShiftManagement> {
    return this.shiftRepository.manager.transaction(async (manager) => {
      const shiftRepo = manager.getRepository(ShiftManagement);
      const orderRepo = manager.getRepository(Order);

      const shift = await shiftRepo.findOne({
        where: { id: shiftId },
        relations: ['branch'],
      });
      if (!shift) {
        throw new NotFoundException(`Shift ${shiftId} not found`);
      }
      if (shift.status === ShiftStatus.CLOSED) {
        throw new BadRequestException(`Shift ${shiftId} is already closed`);
      }

      const preparedOrders = await orderRepo.find({
        where: {
          shift: { id: shiftId },
          status: OrderStatus.PREPARED,
        },
      });

      const allShiftOrders = await orderRepo.count({
        where: { shift: { id: shiftId } },
      });

      const ordersTotalRow = await orderRepo
        .createQueryBuilder('order')
        .select('COALESCE(SUM(order.total_amount), 0)', 'total')
        .where('order.shift_management_id = :shiftId', { shiftId })
        .andWhere('order.status = :status', {
          status: OrderStatus.PREPARED,
        })
        .getRawOne<{ total: string }>();

      if (preparedOrders.length > 0) {
        for (const order of preparedOrders) {
          order.status = OrderStatus.SHIFT_CALCULATED;
          order.updatedBy = updater;
        }
        await orderRepo.save(preparedOrders);
      }

      shift.endShift = new Date();
      shift.endMoney = dto.endMoney;
      shift.actualEndMoney = roundMoney(Number(ordersTotalRow?.total ?? 0));
      shift.status = ShiftStatus.CLOSED;
      shift.totalOrders = allShiftOrders;
      if (dto.notes !== undefined) {
        shift.notes = dto.notes;
      }
      shift.updatedBy = updater;

      await manager.getRepository(Branch).update(
        { id: shift.branch.id },
        { nextOrderQueue: resetOrderQueueCounter() },
      );

      return shiftRepo.save(shift);
    });
  }
}
