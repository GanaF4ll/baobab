import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { UserEntity } from '../entities/user.entity';

export class CreateUserDto extends PickType(UserEntity, ['email', 'firstName', 'lastName']) {
  @ApiProperty({ description: 'Password of the user' })
  @IsString()
  password: string;
}
