import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Store } from './entities/store.entity'

@Injectable()
export class StoresService {
  constructor(
    @InjectRepository(Store)
    private storeRepository: Repository<Store>,
  ) {}

  async findAll() {
    return this.storeRepository.find({ where: { isActive: true } })
  }

  async findById(id: string) {
    return this.storeRepository.findOne({ where: { id }, relations: { deals: true } })
  }

  async create(data: Partial<Store>) {
    const store = this.storeRepository.create(data)
    return this.storeRepository.save(store)
  }

  async update(id: string, data: Partial<Store>) {
    await this.storeRepository.update(id, data)
    return this.findById(id)
  }
}
