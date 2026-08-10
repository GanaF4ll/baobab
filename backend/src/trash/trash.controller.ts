import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { TRASH_SWAGGER_TAG } from 'src/swagger.config';
import { TrashService } from './trash.service';

@Controller('trash')
@ApiTags(TRASH_SWAGGER_TAG)
@UseGuards(AuthGuard)
export class TrashController {
  constructor(private readonly trashService: TrashService) {}

  @Get()
  @ApiOperation({
    summary: "Get all the user's trashed items, includes workspaces, documents and conversations",
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  // @ApiOkResponse({ type: TrashCollectionResponseDto })
  //todo: types
  async findAll(@CurrentUser('id') userId: string) {
    return await this.trashService.findAll(userId);
  }
}
