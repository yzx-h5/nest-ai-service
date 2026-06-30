import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiOkResponseWrapped } from '../common/response/api-response.dto';
import { DocumentParserService } from './document-parser.service';
import { ImportTextDto } from './dto/import-text.dto';
import {
  ImportDocumentResponseDto,
  QueryKnowledgeResponseDto,
} from './dto/knowledge-response.dto';
import { QueryKnowledgeDto } from './dto/query.dto';
import { KnowledgeService } from './knowledge.service';

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

@ApiTags('AI Knowledge')
@Controller('ai/knowledge')
export class KnowledgeController {
  constructor(
    private readonly knowledgeService: KnowledgeService,
    private readonly documentParserService: DocumentParserService,
  ) {}

  @Post('documents/text')
  @ApiOperation({ summary: '导入文本到知识库' })
  @ApiOkResponseWrapped(ImportDocumentResponseDto, '文本导入成功')
  async importText(
    @Body() body: ImportTextDto,
  ): Promise<ImportDocumentResponseDto> {
    return this.knowledgeService.importText(body.text, {
      source: body.source,
    });
  }

  @Post('documents/upload')
  @ApiOperation({
    summary: '上传文件到知识库',
    description:
      '支持 .txt、.md、.pdf、.docx、.xlsx、.xls 格式，单文件最大 20MB',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '待导入的文档文件',
        },
      },
    },
  })
  @ApiOkResponseWrapped(ImportDocumentResponseDto, '文件导入成功')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ImportDocumentResponseDto> {
    if (!file) {
      throw new BadRequestException('请上传 file 字段对应的文件');
    }

    if (!this.documentParserService.isSupported(file.originalname)) {
      throw new BadRequestException(
        this.documentParserService.getSupportedFormatsMessage(),
      );
    }

    return this.knowledgeService.importFile(file.buffer, file.originalname);
  }

  @Post('query')
  @ApiOperation({ summary: '基于知识库检索并回答问题' })
  @ApiOkResponseWrapped(QueryKnowledgeResponseDto, '问答成功')
  async query(
    @Body() body: QueryKnowledgeDto,
  ): Promise<QueryKnowledgeResponseDto> {
    return this.knowledgeService.query(body.question);
  }
}
