import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { EnvironmentsService } from './environments.service';
import { CreateEnvironmentDto } from './dto/create-environment.dto';
import { UpdateEnvironmentDto } from './dto/update-environment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('api/environments')
@UseGuards(JwtAuthGuard)
export class EnvironmentsController {
  constructor(private readonly environmentsService: EnvironmentsService) {}

  @Post()
  create(
    @Body() createEnvironmentDto: CreateEnvironmentDto,
    @CurrentUser() user: User,
  ) {
    return this.environmentsService.create(createEnvironmentDto, user);
  }

  @Get()
  findAll(
    @Query('applicationId', ParseUUIDPipe) applicationId: string,
    @CurrentUser() user: User,
  ) {
    return this.environmentsService.findAllByApplication(applicationId, user);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.environmentsService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateEnvironmentDto: UpdateEnvironmentDto,
    @CurrentUser() user: User,
  ) {
    return this.environmentsService.update(id, updateEnvironmentDto, user);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.environmentsService.remove(id, user);
  }
}
