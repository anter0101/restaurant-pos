import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './modules/user/user.module';
import { BranchModule } from './modules/branch/branch.module';
import { MenuCategoryModule } from './modules/menu-category/menu-category.module';
import { MenuItemModule } from './modules/menu-item/menu-item.module';
import { DeliveryRegionModule } from './modules/delivery-region/delivery-region.module';
import { ShiftManagementModule } from './modules/shift-management/shift-management.module';
import { OrderModule } from './modules/order/order.module';
import { AuthModule } from './modules/auth/auth.module';
import PostgresTypeorm from 'src/config/db-config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.development'],
    }),
    TypeOrmModule.forRootAsync({
      useClass: PostgresTypeorm,
      inject: [PostgresTypeorm],
    }),
    AuthModule,
    UserModule,
    BranchModule,
    MenuCategoryModule,
    MenuItemModule,
    DeliveryRegionModule,
    ShiftManagementModule,
    OrderModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
