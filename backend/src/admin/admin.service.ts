import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';

export interface CreateUserDto {
  email: string;
  password: string;
  fullName?: string;
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
  role?: 'user' | 'admin';
}

export interface UpdateUserDto {
  email?: string;
  password?: string;
  fullName?: string;
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
  role?: 'user' | 'admin';
}

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Returns all users, omitting the passwordHash field.
   */
  async findAll(): Promise<Omit<User, 'passwordHash'>[]> {
    const users = await this.userRepository.find({
      order: { createdAt: 'DESC' },
    });
    return users.map((user) => this.omitPassword(user));
  }

  /**
   * Returns a single user by ID (omits passwordHash).
   */
  async findOne(id: string): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Usuario con id "${id}" no encontrado / User with id "${id}" not found.`);
    }
    return this.omitPassword(user);
  }

  /**
   * Creates a new user with a bcrypt-hashed password.
   */
  async create(dto: CreateUserDto): Promise<Omit<User, 'passwordHash'>> {
    if (!dto.email || !dto.password) {
      throw new BadRequestException('Email and password are required.');
    }

    const existing = await this.userRepository.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException(`Email "${dto.email}" is already registered.`);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = this.userRepository.create({
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      birthTime: dto.birthTime,
      birthPlace: dto.birthPlace,
      role: dto.role ?? 'user',
    });

    const saved = await this.userRepository.save(user);
    return this.omitPassword(saved);
  }

  /**
   * Updates user fields. If password is supplied it is re-hashed.
   */
  async update(id: string, dto: UpdateUserDto): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Usuario con id "${id}" no encontrado / User with id "${id}" not found.`);
    }

    if (dto.email !== undefined) user.email = dto.email;
    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.birthDate !== undefined) user.birthDate = new Date(dto.birthDate);
    if (dto.birthTime !== undefined) user.birthTime = dto.birthTime;
    if (dto.birthPlace !== undefined) user.birthPlace = dto.birthPlace;
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    const saved = await this.userRepository.save(user);
    return this.omitPassword(saved);
  }

  /**
   * Hard-deletes a user by ID.
   */
  async remove(id: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Usuario con id "${id}" no encontrado / User with id "${id}" not found.`);
    }
    await this.userRepository.remove(user);
    return { message: `User "${id}" deleted successfully.` };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private omitPassword(user: User): Omit<User, 'passwordHash'> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...rest } = user as any;
    return rest;
  }
}
