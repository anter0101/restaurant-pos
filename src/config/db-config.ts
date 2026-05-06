import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import * as path from 'path';

@Injectable()
export default class PostgresTypeorm implements TypeOrmOptionsFactory {
  constructor(private readonly configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    return {
      type: 'postgres',
      logging: this.configService.get<boolean>('DATABASE_LOGGING', true),
      synchronize: this.configService.get<boolean>(
        'DATABASE_SYNCHRONIZE',
        false,
      ),
      migrationsRun: this.configService.get<boolean>(
        'DATABASE_MIGRATIONS_RUN',
        true,
      ),
      entities: [path.join(__dirname, '..', '**', '*.entity.{ts,js}')],
      migrations: [
        path.join(__dirname, '..', 'database/migrations', '**', '*{.ts,.js}'),
      ],
      database: this.configService.get<string>('DATABASE_NAME'),
      host: this.configService.get<string>('DATABASE_HOST'),
      port: this.configService.get<number>('DATABASE_PORT'),
      username: this.configService.get<string>('DATABASE_USER'),
      password: this.configService.get<string>('DATABASE_PASSWORD'),
      // ssl: {
      //   rejectUnauthorized: false,
      // },
    };
  }
}
