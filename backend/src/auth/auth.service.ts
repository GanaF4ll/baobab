import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from 'src/drizzle/drizzle.module';
import * as schema from 'src/drizzle/schema';
import { DrizzleDb } from 'src/drizzle/types/drizzle';
import { TokenType } from 'src/shared/constants';
import { UsersService } from 'src/users/users.service';
import { CreateUserDto } from './../users/dto/create-user.dto';
import { LoginDto } from './dto/input/login.dto';
import { RegisterAndLoginResponseData } from './dto/output/register-and-login-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly userService: UsersService,
    private readonly configService: ConfigService,
    @Inject(DRIZZLE) private db: DrizzleDb,
  ) {}
  private readonly SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  private readonly logger = new Logger(AuthService.name);

  private get TOKEN_EXPIRATION_TIME() {
    return this.configService.getOrThrow<string>('NODE_ENV') === 'production' ? '15m' : '1d';
  }

  async register(createUserDto: CreateUserDto): Promise<RegisterAndLoginResponseData> {
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

    const refreshToken = this.jwt.sign(
      { ...payload, type: TokenType.REFRESH },
      { expiresIn: '7d' },
    );

    await this.db.insert(schema.refreshTokens).values({
      userId: newUser.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + this.SEVEN_DAYS),
    });

    return { accessToken, refreshToken };
  }

  async login(dto: LoginDto): Promise<RegisterAndLoginResponseData> {
    const { email, password } = dto;
    const formattedEmail = email.toLowerCase();
    const existingUser = await this.userService.findOneByEmail(formattedEmail);

    if (!existingUser) {
      this.logger.error(`User with email "${email}" not found`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await argon2.verify(existingUser.passwordHash, password);

    if (!isPasswordValid) {
      this.logger.error(`Invalid credentials for email "${email}"`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const existingRefreshToken = await this.db.query.refreshTokens.findFirst({
      where: (tokens) => eq(tokens.userId, existingUser.id),
    });

    if (existingRefreshToken) {
      await this.db
        .delete(schema.refreshTokens)
        .where(eq(schema.refreshTokens.id, existingRefreshToken.id));
    }

    const payload = { id: existingUser.id };
    const accessToken = this.jwt.sign(
      { ...payload, type: TokenType.ACCESS },
      { expiresIn: this.TOKEN_EXPIRATION_TIME },
    );

    const refreshToken = this.jwt.sign(
      { ...payload, type: TokenType.REFRESH },
      { expiresIn: '7d' },
    );

    await this.db.insert(schema.refreshTokens).values({
      userId: existingUser.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + this.SEVEN_DAYS),
    });

    return { accessToken, refreshToken };
  }

  async refresh(refreshToken: string): Promise<RegisterAndLoginResponseData> {
    try {
      const payload = await this.jwt.verifyAsync(refreshToken);
      const { id, type } = payload as { id: string; type: TokenType };

      if (type !== TokenType.REFRESH) {
        this.logger.error(`Invalid token type: "${type}, expected : ${TokenType.REFRESH}"`);
        throw new UnauthorizedException('Invalid token');
      }

      const existingUser = await this.userService.findOneById(id);

      if (!existingUser) {
        this.logger.error(`User with id "${id}" not found`);
        throw new UnauthorizedException('Invalid token');
      }

      const existingRefreshToken = await this.db.query.refreshTokens.findFirst({
        where: (tokens) => eq(tokens.token, refreshToken),
      });

      if (!existingRefreshToken) {
        this.logger.error(`Refresh token not found for user "${id}"`);
        throw new UnauthorizedException('Invalid token');
      }

      if (existingRefreshToken.expiresAt < new Date()) {
        this.logger.error(`Refresh token for user "${id}" has expired`);
        throw new UnauthorizedException('Invalid token');
      }

      const newPayload = { id: existingUser.id };

      const accessToken = this.jwt.sign(
        { ...newPayload, type: TokenType.ACCESS },
        { expiresIn: this.TOKEN_EXPIRATION_TIME },
      );

      const newRefreshToken = this.jwt.sign(
        { ...payload, type: TokenType.REFRESH },
        { expiresIn: '7d' },
      );

      await this.db.insert(schema.refreshTokens).values({
        userId: existingUser.id,
        token: newRefreshToken,
        expiresAt: new Date(Date.now() + this.SEVEN_DAYS),
      });

      return { accessToken, refreshToken: newRefreshToken };
    } catch (error) {
      this.logger.error(error.message);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
