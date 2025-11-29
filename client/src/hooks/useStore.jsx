import { useContext } from 'react';
import Context from '../store/Context';

export const useStore = () => {
    const dataUser = useContext(Context);
    return dataUser;
};
