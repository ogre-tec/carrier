import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const hashedPassword = createUserDto.password
      ? await bcrypt.hash(createUserDto.password, 10)
      : null;

    const user = this.usersRepository.create({
      email: createUserDto.email,
      name: createUserDto.name,
      password: hashedPassword,
      role: createUserDto.role || UserRole.DEPLOYER,
      provider: createUserDto.provider || 'local',
      providerId: createUserDto.providerId || null,
    });

    return this.usersRepository.save(user) as Promise<User>;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findByProvider(provider: string, providerId: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { provider, providerId } });
  }

  async findOrCreateFromOAuth(profile: {
    email: string;
    name: string;
    provider: string;
    providerId: string;
  }): Promise<User> {
    let user = await this.findByProvider(profile.provider, profile.providerId);

    if (!user) {
      user = await this.findByEmail(profile.email);
      if (user) {
        user.provider = profile.provider;
        user.providerId = profile.providerId;
        await this.usersRepository.save(user);
      } else {
        user = await this.create({
          email: profile.email,
          name: profile.name,
          provider: profile.provider,
          providerId: profile.providerId,
          password: '',
        });
      }
    }

    return user;
  }

  async findAll(): Promise<(Partial<User> & { protected: boolean })[]> {
    const primaryEmail = process.env.ADMIN_EMAIL || 'admin@local.host';
    const users = await this.usersRepository.find({
      select: ['id', 'email', 'name', 'provider', 'active', 'role', 'createdAt'],
      order: { createdAt: 'DESC' },
    });
    return users.map(u => ({ ...u, protected: u.email === primaryEmail }));
  }

  async setActive(id: string, active: boolean): Promise<Partial<User>> {
    await this.assertNotPrimaryAdmin(id);
    await this.usersRepository.update(id, { active });
    const user = await this.findById(id);
    const { password: _password, ...result } = user!;
    return result;
  }

  async setRole(id: string, role: UserRole): Promise<Partial<User>> {
    await this.assertNotPrimaryAdmin(id);
    await this.usersRepository.update(id, { role });
    const user = await this.findById(id);
    const { password: _password, ...result } = user!;
    return result;
  }

  /** Activation-only method reserved for the seed bootstrap process. */
  async activatePrimaryAdmin(id: string): Promise<void> {
    await this.usersRepository.update(id, { active: true });
  }

  private async assertNotPrimaryAdmin(id: string): Promise<void> {
    const primaryEmail = process.env.ADMIN_EMAIL || 'admin@local.host';
    const user = await this.findById(id);
    if (user?.email === primaryEmail) {
      throw new ForbiddenException('The primary admin account cannot be modified');
    }
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    if (!user.password) return false;
    return bcrypt.compare(password, user.password);
  }
}
