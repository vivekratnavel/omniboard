import axios from 'axios';

let axiosDefault = axios.create({
    baseURL: '/'
});

export default axiosDefault;