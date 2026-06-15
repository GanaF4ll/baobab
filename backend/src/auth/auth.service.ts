import { CreateUserDto } from './../users/dto/create-user.dto';
import { ConflictException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import * as argon2 from 'argon2';
import { TokenType } from 'src/shared/constants';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly userService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  private get TOKEN_EXPIRATION_TIME() {
    return this.configService.getOrThrow<string>('NODE_ENV') === 'production' ? '15m' : '1d';
  }

  async register(createUserDto: CreateUserDto) {
    const { email, password, firstName, lastName } = createUserDto;
    const existingUser = await this.userService.findOneByEmail(email);

    if (existingUser) {
      throw new ConflictException(`User with email "${email}" already exists`);
    }

    const hashedPassword = await argon2.hash(password);
    const newUser = await this.userService.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
    });

    const payload = { id: newUser.id };

    const accessToken = this.jwt.sign(
      { ...payload, type: TokenType.ACCESS },
      { expiresIn: this.TOKEN_EXPIRATION_TIME },
    );

    return accessToken;
  }
}
