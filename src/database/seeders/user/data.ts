import { UserDTO } from 'src/app/modules/user/dtos/user.dto';
import { UserRole } from 'src/core/enums/user-role';

export const users: UserDTO[] = [
  {
    id: 1,
    name: 'Administrator',
    username: 'admin',
    password: '123456',
    role: UserRole.ADMIN,
    isActive: true,
    createdBy: 'system',
  },
];
    