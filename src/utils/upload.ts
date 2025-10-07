import { v2 as cloudinaryV2 } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';
import multer from 'multer';

dotenv.config();

interface CloudinaryConfigOptions {
  cloud_name: string;
  api_key: string;
  api_secret: string;
  [key: string]: string;
}

const cloudinaryConfig: CloudinaryConfigOptions = {
  cloud_name: process.env.CLOUDINARY_NAME || '',
  api_key: process.env.CLOUDINARY_KEY || '',
  api_secret: process.env.CLOUDINARY_SECRET || '',
};

cloudinaryV2.config(cloudinaryConfig);

// Storage config (ảnh, file đều sẽ đẩy vào folder Han_Cf)
const storage = new CloudinaryStorage({
  cloudinary: cloudinaryV2,
  params: async (req, file) => {
    let resource_type: 'image' | 'raw' | 'video' = 'raw';

    if (file.mimetype.startsWith('image/')) {
      resource_type = 'image';
    } else if (file.mimetype.startsWith('video/')) {
      resource_type = 'video';
    }

    return {
      folder: 'Han_Cf',
      resource_type, // để Cloudinary phân loại
      // public_id: `${Date.now()}-${file.originalname.split('.')[0]}`,
      public_id: `${Date.now()}-${file.originalname}`,
    };
  },
});

const uploadCloud = multer({ storage });

export default uploadCloud;
