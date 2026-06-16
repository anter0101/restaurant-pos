import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, FindOneOptions, Repository } from 'typeorm';
import { DeliveryRegion } from './delivery-region.entity';
import { CreateDeliveryRegionDTO } from './dtos/create-delivery-region.dto';
import { UpdateDeliveryRegionDTO } from './dtos/update-delivery-region.dto';
import {
  mapCreateDeliveryRegionDtoToEntity,
  mapUpdateDeliveryRegionDtoToEntity,
} from './delivery-region.mapper';

@Injectable()
export class DeliveryRegionService {
  constructor(
    @InjectRepository(DeliveryRegion)
    private readonly deliveryRegionRepository: Repository<DeliveryRegion>,
  ) {}

  async findById(id: number): Promise<DeliveryRegion | undefined> {
    const result = await this.deliveryRegionRepository.findOne({
      where: { id },
      relations: ['branch'],
    });
    return result ?? undefined;
  }

  async findByFields(
    options: FindOneOptions<DeliveryRegion>,
  ): Promise<DeliveryRegion | undefined> {
    const result = await this.deliveryRegionRepository.findOne(options);
    return result ?? undefined;
  }

  async findAndCount(
    options: FindManyOptions<DeliveryRegion>,
  ): Promise<[DeliveryRegion[], number]> {
    return this.deliveryRegionRepository.findAndCount(options);
  }

  async save(
    dto: CreateDeliveryRegionDTO,
    creator?: string,
  ): Promise<DeliveryRegion> {
    const region = mapCreateDeliveryRegionDtoToEntity(dto);
    if (creator) {
      region.createdBy = creator;
      region.updatedBy = creator;
    }
    return this.deliveryRegionRepository.save(region);
  }

  async update(
    regionDTO: UpdateDeliveryRegionDTO,
    updater?: string,
  ): Promise<UpdateDeliveryRegionDTO> {
    if (updater) {
      regionDTO.updatedBy = updater;
    }
    const partial = mapUpdateDeliveryRegionDtoToEntity(regionDTO);
    await this.deliveryRegionRepository.update({ id: regionDTO.id }, partial);
    return regionDTO;
  }

  async delete(region: DeliveryRegion): Promise<DeliveryRegion | undefined> {
    return this.deliveryRegionRepository.remove(region);
  }
}
