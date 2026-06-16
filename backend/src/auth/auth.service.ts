import { CreateUserDto } from './../users/dto/create-user.dto';
import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import * as argon2 from 'argon2';
import { TokenType } from 'src/shared/constants';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/input/login.dto';

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

  async register(createUserDto: CreateUserDto): Promise<string> {
    const { email, password, firstName, lastName } = createUserDto;
    const existingUser = await this.userService.findOneByEmail(email);

    if (existingUser) {
      throw new ConflictException(`User with email "${email}" already exists`);
    }

    const hashedPassword = await argon2.hash(password);
    const formattedFirstName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
    const formattedLastName = lastName.toUpperCase();
    const formattedEmail = email.toLowerCase();

    const newUser = await this.userService.create({
      email: formattedEmail,
      password: hashedPassword,
      firstName: formattedFirstName,
      lastName: formattedLastName,
    });

    const payload = { id: newUser.id };

    const accessToken = this.jwt.sign(
      { ...payload, type: TokenType.ACCESS },
      { expiresIn: this.TOKEN_EXPIRATION_TIME },
    );

    return accessToken;
  }

  async login(dto: LoginDto): Promise<string> {
    const { email, password } = dto;
    const formattedEmail = email.toLowerCase();
    const existingUser = await this.userService.findOneByEmail(formattedEmail);

    if (!existingUser) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await argon2.verify(existingUser.passwordHash, password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { id: existingUser.id };
    const accessToken = this.jwt.sign(
      { ...payload, type: TokenType.ACCESS },
      { expiresIn: this.TOKEN_EXPIRATION_TIME },
    );

    return accessToken;
  }
}
