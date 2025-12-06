import { checkSchema } from 'express-validator';

const RegisterMiddleware = checkSchema({
  username: {
    notEmpty: true,
    errorMessage: {
      msg: 'Username is required',
    },
  },

  email: {
    isEmail: {
      errorMessage: {
        msg: 'Please enter a valid email address',
      },
    },
    notEmpty: {
      errorMessage: {
        msg: 'Bạn Chưa Nhập Email ',
      },
    },
    normalizeEmail: true,
  },
  password: {
    isString: true,
    notEmpty: {
      errorMessage: {
        msg: 'Bạn Chưa Nhập Mật Khẩu',
      },
    },
    isLength: {
      options: { min: 6 },
      errorMessage: {
        msg: 'Mật khẩu phải có ít nhất 6 ký tự',
      },
    },
  },
  confirmPassword: {
    isString: true,
    notEmpty: {
      errorMessage: {
        msg: 'Confirm password is required',
      },
    },
  },
   department: {
    notEmpty: true,
    errorMessage: {
      msg: 'Department is required',
    },
  },
});

const LoginMiddleware = checkSchema({
  email: {
    isEmail: {
      errorMessage: {
        msg: 'Bạn Chưa Nhập Email hợp lệ',
      },
    },
    notEmpty: {
      errorMessage: {
        msg: 'Bạn Chưa Nhập Email',
      },
    },
    normalizeEmail: true,
  },
  password: {
    isString: true,
    notEmpty: {
      errorMessage: {
        msg: 'Bạn Chưa Nhập Mật Khẩu',
      },
    },
    isLength: {
      options: { min: 6 },
      errorMessage: {
        msg: 'Mật khẩu phải có ít nhất 6 ký tự',
      },
    },
  },
});

const GetVerifyEmailTokenMiddleWare = checkSchema({
  verifyEmailToken: {
    notEmpty: {
      errorMessage: {
        msg: 'Verify Email Token is required',
      },
    },
    isString: true,
  },
});

export { RegisterMiddleware, LoginMiddleware, GetVerifyEmailTokenMiddleWare };
