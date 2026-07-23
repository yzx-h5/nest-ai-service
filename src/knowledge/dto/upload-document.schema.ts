import path from 'node:path';
import { defineObjectSchema } from '../../common/validation/joi';
import type { SupportedDocumentExtension } from '../../interfaces/knowledge/document-parser.interface';
import type { UploadDocumentSchemaInput } from '../../interfaces/knowledge/knowledge-dto.interface';
import { SUPPORTED_DOCUMENT_EXTENSIONS } from '../document-parser.service';

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export const SUPPORTED_FORMATS_MESSAGE =
  '支持 .txt、.md、.pdf、.docx、.xlsx、.xls 格式';

function getExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf('.');
  if (dotIndex === -1) {
    return '';
  }
  return filename.slice(dotIndex).toLowerCase();
}

export const uploadDocumentSchema = defineObjectSchema((Joi) =>
  Joi.object<UploadDocumentSchemaInput>({
    originalname: Joi.string()
      .trim()
      .required()
      .custom((value: string, helpers) => {
        const basename = path.basename(value);
        if (!basename || basename === '.' || basename === '..') {
          return helpers.error('string.empty');
        }

        const extension = getExtension(basename);
        if (
          !SUPPORTED_DOCUMENT_EXTENSIONS.includes(
            extension as SupportedDocumentExtension,
          )
        ) {
          return helpers.error('any.invalid');
        }

        return basename;
      })
      .messages({
        'any.required': '请上传 file 字段对应的文件',
        'string.empty': '文件名无效',
        'any.invalid': SUPPORTED_FORMATS_MESSAGE,
      }),
    buffer: Joi.binary().max(MAX_UPLOAD_BYTES).required().messages({
      'any.required': '请上传 file 字段对应的文件',
      'binary.max': '单文件最大 20MB',
    }),
  })
    .required()
    .messages({
      'any.required': '请上传 file 字段对应的文件',
    }),
);
