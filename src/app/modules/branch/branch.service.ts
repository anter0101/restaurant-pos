import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Branch } from './branch.entity';
import { FindManyOptions, FindOneOptions, Repository } from 'typeorm';
import { UpdateBranchDTO } from './dtos/update-branch.dto';
import { CreateBranchDTO } from './dtos/create-branch.dto';
import {
  mapCreateBranchDtoToEntity,
  mapUpdateBranchDtoToEntity,
} from './branch.mapper';

@Injectable()
export class BranchService {
  constructor(
    @InjectRepository(Branch)
    private branchRepository: Repository<Branch>,
  ) {}

  async findById(id: number): Promise<Branch | undefined> {
    const result = await this.branchRepository.findOne({ where: { id } });
    return result ?? undefined;
  }

  async findByFields(
    options: FindOneOptions<Branch>,
  ): Promise<Branch | undefined> {
    const result = await this.branchRepository.findOne(options);
    return result ?? undefined;
  }

  async findAndCount(
    options: FindManyOptions<Branch>,
  ): Promise<[Branch[], number]> {
    return this.branchRepository.findAndCount(options);
  }

  async save(dto: CreateBranchDTO, creator?: string): Promise<Branch> {
    const branch = mapCreateBranchDtoToEntity(dto);
    if (creator) {
      branch.createdBy = creator;
      branch.updatedBy = creator;
    }
    return this.branchRepository.save(branch);
  }

  async update(
    branchDTO: UpdateBranchDTO,
    updater?: string,
  ): Promise<UpdateBranchDTO> {
    if (updater) {
      branchDTO.updatedBy = updater;
    }
    const partial = mapUpdateBranchDtoToEntity(branchDTO);
    await this.branchRepository.update({ id: branchDTO.id }, partial);
    return branchDTO;
  }

  async delete(branch: Branch): Promise<Branch | undefined> {
    return this.branchRepository.remove(branch);
  }
}
