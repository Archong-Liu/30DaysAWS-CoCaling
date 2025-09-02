import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { Amplify } from 'aws-amplify';

// 讀取環境變數
const REGION = process.env.REACT_APP_AWS_REGION || 'ap-east-1';
const USER_POOL_ID = process.env.REACT_APP_USER_POOL_ID;
const USER_POOL_CLIENT_ID = process.env.REACT_APP_USER_POOL_CLIENT_ID;
const IDENTITY_POOL_ID = process.env.REACT_APP_IDENTITY_POOL_ID;
const API_ENDPOINT = process.env.REACT_APP_API_GATEWAY_URL;
const COGNITO_DOMAIN = process.env.REACT_APP_COGNITO_DOMAIN; // 不要包含 https://
const REDIRECT_SIGN_IN = process.env.REACT_APP_REDIRECT_SIGN_IN || 'http://localhost:3000/';
const REDIRECT_SIGN_OUT = process.env.REACT_APP_REDIRECT_SIGN_OUT || 'http://localhost:3000/';

// 組裝 Amplify v6 設定（新版命名空間）
const amplifyConfig = {
  Auth: {
    Cognito: {
      region: REGION,
      userPoolId: USER_POOL_ID,
      userPoolClientId: USER_POOL_CLIENT_ID,
      identityPoolId: IDENTITY_POOL_ID,
      loginWith: {
        username: false,
        email: false,
        // 只使用 Hosted UI（若要顯示內嵌表單再改為 true）
        ...(COGNITO_DOMAIN
          ? {
                              oauth: {
                  domain: COGNITO_DOMAIN,
                  scopes: ['openid', 'email', 'profile', 'aws.cognito.signin.user.admin'],
                  redirectSignIn: [REDIRECT_SIGN_IN],
                  redirectSignOut: [REDIRECT_SIGN_OUT],
                  responseType: 'code'
                }
            }
          : {})
      }
    }
  },
  API: {
    REST: {
      CalendarAPI: {
        endpoint: API_ENDPOINT,
        region: REGION
      }
    }
  }
};

Amplify.configure(amplifyConfig);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
