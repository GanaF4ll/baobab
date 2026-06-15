import { PickType } from '@nestjs/swagger';
import { UserEntity } from '../entities/user.entity';
import { IsString } from 'class-validator';

export class CreateUserDto extends PickType(UserEntity, ['email', 'firstName', 'lastName']) {
  @IsString()
  password: string;
}
