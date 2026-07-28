import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import * as schema from 'src/drizzle/schema';
import { DrizzleDb } from 'src/drizzle/types/drizzle';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDb) {}

  async create(createUserDto: CreateUserDto) {
    const [newUser] = await this.db
      .insert(schema.users)
      .values({
        email: createUserDto.email,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        passwordHash: createUserDto.password,
      })
      .returning({
        id: schema.users.id,
        email: schema.users.email,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        createdAt: schema.users.createdAt,
        updatedAt: schema.users.updatedAt,
      });

    return newUser;
  }

  findAll() {
    return `This action returns all users`;
  }

  async findOneById(id: string) {
    const existingUser = await this.db.query.users.findFirst({
      where: (users) => eq(users.id, id),
    });

    if (!existingUser) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    return existingUser;
  }

  async findOneByEmail(email: string) {
    const existingUser = await this.db.query.users.findFirst({
      where: (users) => eq(users.email, email),
    });

    return existingUser;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
