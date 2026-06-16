import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsString, IsUUID } from 'class-validator';

export class UserEntity {
  @IsUUID()
  @ApiProperty({ description: 'UUID of the user' })
  id: string;

  @IsEmail()
  @ApiProperty({ description: 'Email of the user' })
  email: string;

  @IsString()
  @ApiProperty({ description: 'Hashed password of the user' })
  passwordHash: string;

  @IsString()
  @ApiProperty({ description: 'First name of the user' })
  firstName: string;

  @IsString()
  @ApiProperty({ description: 'Last name of the user' })
  lastName: string;

  @IsDateString()
  @ApiProperty({ description: 'Creation date of the user' })
  createdAt: Date;

  @IsDateString()
  @ApiProperty({ description: 'Update date of the user' })
  updatedAt: Date;
}
