import { ApiProperty, PickType } from '@nestjs/swagger';
import { UserEntity } from '../entities/user.entity';
import { IsString } from 'class-validator';

export class CreateUserDto extends PickType(UserEntity, ['email', 'firstName', 'lastName']) {
  @ApiProperty({ description: 'Password of the user' })
  @IsString()
  password: string;
}

