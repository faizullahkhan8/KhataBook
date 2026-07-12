export const checkInternetConnection = async (): Promise<boolean> => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s timeout
        
        const response = await fetch("https://clients3.google.com/generate_204", {
            method: "GET",
            headers: {
                "Cache-Control": "no-cache",
            },
            signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        return response.status === 204;
    } catch (error) {
        return false;
    }
};
