import { useState, useEffect } from 'react'; // import thu vien

function useDebounce(value, delay) {
    // tao hook useDebounce
    const [debounceValue, setDebounceValue] = useState(value); // tao state

    useEffect(() => {
        // tao effect
        const handler = setTimeout(() => setDebounceValue(value), delay); // xét thời gian gọi API
        return () => clearTimeout(handler); // clear timeout
    }, [value]); // xét lại value, nếu thay đổi thì set code useeffect
    return debounceValue; // trả về value để gọi api
}

export default useDebounce; // export hook
