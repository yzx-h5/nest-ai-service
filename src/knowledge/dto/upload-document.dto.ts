import { JoiSchema } from '../../common/validation/joi-schema.decorator';
import { uploadDocumentSchema } from './upload-document.schema';

@JoiSchema(uploadDocumentSchema)
export class UploadDocumentDto {
  buffer: Buffer;
  originalname: string;
}
