import axios from 'axios';

const axiosDefault = axios.create({
  baseURL: '/'
});

export default axiosDefault;
