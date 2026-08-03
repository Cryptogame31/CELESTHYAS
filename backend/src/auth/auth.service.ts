import { Injectable, ConflictException, UnauthorizedException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { GamificationState } from '../gamification/entities/gamification-state.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(GamificationState)
    private readonly gamificationRepository: Repository<GamificationState>,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.userRepository.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('El correo ya está registrado / Email is already registered.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepository.create({
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      birthTime: dto.birthTime,
      birthPlace: dto.birthPlace,
    });

    const savedUser = await this.userRepository.save(user);

    // Initialize default gamification state
    const gamification = this.gamificationRepository.create({
      userId: savedUser.id,
      streakDays: 0,
      totalPoints: 10, // Welcoming points!
      level: 1,
      unlockedBadges: ['Welcome Explorer'],
    });
    await this.gamificationRepository.save(gamification);

    this.logger.log(`New user registered: ${dto.email}`);
    return this.generateTokens(savedUser);
  }

  async login(dto: LoginDto) {
    const user = await this.userRepository.findOne({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas / Invalid credentials.');
    }

    const match = await bcrypt.compare(dto.password, user.passwordHash);
    if (!match) {
      throw new UnauthorizedException('Credenciales inválidas / Invalid credentials.');
    }

    this.logger.log(`User logged in: ${dto.email}`);
    return this.generateTokens(user);
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.userRepository.findOne({ where: { id: payload.sub } });
      if (!user) {
        throw new UnauthorizedException('Token inválido / Invalid token.');
      }
      return this.generateTokens(user);
    } catch (e) {
      throw new UnauthorizedException('Token de actualización expirado o inválido / Expired or invalid refresh token.');
    }
  }

  /**
   * Updates the logged-in user's profile fields.
   * If newPassword is provided, currentPassword is verified first.
   */
  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado / User not found.');
    }

    // Handle password change
    if (dto.newPassword) {
      if (!dto.currentPassword) {
        throw new BadRequestException(
          'Se requiere la contraseña actual para cambiar la contraseña / currentPassword is required to set a new password.',
        );
      }
      const passwordMatches = await bcrypt.compare(dto.currentPassword, user.passwordHash);
      if (!passwordMatches) {
        throw new UnauthorizedException(
          'La contraseña actual es incorrecta / Current password is incorrect.',
        );
      }
      user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    }

    // Update profile fields if supplied
    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.birthDate !== undefined) user.birthDate = new Date(dto.birthDate);
    if (dto.birthTime !== undefined) user.birthTime = dto.birthTime;
    if (dto.birthPlace !== undefined) user.birthPlace = dto.birthPlace;

    const saved = await this.userRepository.save(user);

    // Omit passwordHash from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...profile } = saved as any;
    this.logger.log(`Profile updated for user: ${user.email}`);
    return profile;
  }

  async getProfile(userId: string): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado / User not found.');
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...profile } = user as any;
    return profile;
  }

  private generateTokens(user: User) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      birthDate: user.birthDate,
      birthTime: user.birthTime,
      birthPlace: user.birthPlace,
      role: user.role,
      accessToken: this.jwtService.sign(payload, { expiresIn: '15m' }),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
    };
  }
}
