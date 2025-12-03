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
        msg: 'Email is required',
      },
    },
    normalizeEmail: true,
  },
  password: {
    isString: true,
    notEmpty: {
      errorMessage: {
        msg: 'Password is required',
      },
    },
    isLength: {
      options: { min: 6 },
      errorMessage: {
        msg: 'Password must be at least 6 characters long',
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
        msg: 'Please enter a valid email address',
      },
    },
    notEmpty: {
      errorMessage: {
        msg: 'Email is required',
      },
    },
    normalizeEmail: true,
  },
  password: {
    isString: true,
    notEmpty: {
      errorMessage: {
        msg: 'Password is required',
      },
    },
    isLength: {
      options: { min: 6 },
      errorMessage: {
        msg: 'Password must be at least 6 characters long',
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
