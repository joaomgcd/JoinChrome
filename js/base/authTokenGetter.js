
class AuthTokenGetter {
    static tokenCacheKey = 'authTokenCache';

    constructor(account, privateKey, base64Implementation) {
        this.account = account;
        this.privateKey = privateKey;
        this.base64Implementation = base64Implementation;

        // Load cache from localStorage
        const cachedData = localStorage.getItem(AuthTokenGetter.tokenCacheKey);
        AuthTokenGetter.tokenCache = cachedData ? JSON.parse(cachedData) : {};
    }

    static saveCacheToLocalStorage() {
        localStorage.setItem(AuthTokenGetter.tokenCacheKey, JSON.stringify(AuthTokenGetter.tokenCache));
    }

    async createJwtToken() {
        const header = {
            alg: "RS256",
            typ: "JWT"
        };

        const now = Math.floor(Date.now() / 1000);
        const expiry = now + 3600; // 1 hour

        const claims = {
            iss: this.account,
            scope: "https://www.googleapis.com/auth/firebase.messaging",
            aud: "https://oauth2.googleapis.com/token",
            iat: now,
            exp: expiry
        };

        const encodedHeader = this.base64Implementation.encode(JSON.stringify(header));
        const encodedClaims = this.base64Implementation.encode(JSON.stringify(claims));
        const unsignedToken = `${encodedHeader}.${encodedClaims}`;

        const createSignature = async () => {
            const privateKeyContent = this.privateKey
                .replace(/\n/g, '')
                .replace("-----BEGIN PRIVATE KEY-----", '')
                .replace("-----END PRIVATE KEY-----", '');

            const keyBytes = this.base64Implementation.decode(privateKeyContent);
            const key = await crypto.subtle.importKey(
                'pkcs8',
                keyBytes,
                { name: "RSASSA-PKCS1-v1_5", hash: { name: "SHA-256" } },
                false,
                ["sign"]
            );

            const signature = await crypto.subtle.sign(
                "RSASSA-PKCS1-v1_5",
                key,
                new TextEncoder().encode(unsignedToken)
            );

            return this.base64Implementation.encode(signature);
        };

        const signature = await createSignature();
        return `${unsignedToken}.${signature}`;
    }

    async getAccessToken() {
        const currentTime = Math.floor(Date.now() / 1000);

        const existingToken = AuthTokenGetter.tokenCache[this.account];
        if (existingToken && currentTime < existingToken.expiryTime) {
            console.log("Using existing auth token");
            return existingToken.token;
        }

        console.log("Getting new auth token");
        const jwtToken = await this.createJwtToken();

        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion': jwtToken
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Auth token unexpected response code ${response.status}. Error: ${errorText}`);
        }

        const tokenResponse = await response.json();
        if (!tokenResponse.access_token || !tokenResponse.expires_in) {
            throw new Error("Auth token couldn't parse token response");
        }

        const accessToken = tokenResponse.access_token;
        const newCachedToken = { token: accessToken, expiryTime: currentTime + tokenResponse.expires_in };
        AuthTokenGetter.tokenCache[this.account] = newCachedToken;

        // Save cache to localStorage
        AuthTokenGetter.saveCacheToLocalStorage();

        return accessToken;
    }
}

const Base64Implementation = {
    encode: (data) => {
        const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
        return btoa(String.fromCharCode(...new Uint8Array(bytes)));
    },
    decode: (data) => {
        const binaryString = atob(data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }
};

// const authTokenGetter = new AuthTokenGetter(
//     "fcm-sender@join-external-gcm.iam.gserviceaccount.com",
//     "MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCybvuSZiNWISfi\nBiCMLXMtak93LGyE3faxnKg7TSvx19YJ0Stcofq7jyuehcHMhoksYVwSzdfYm8yV\nVIliNNVAysdI4bSELR8LTNF7wVzLi1UNfpjQGuxiWS0VIev1WuheqvHIbdiJtD38\ntQ89cGlKLiN5DizQD5cg6GGcyFwZv35jOQAIYuQhhJZWl8RRkemcndiZ+semmf6E\nTeSGnmbyFmhXyWySerdvyj+ZzvoPL4olo5deURlgoCg8uiv8ajVCOdOkOQ/E9J+n\n2yIwvjGk/VSeMxXpzQw+5Qj2/gvtz6ufAlIBDb4HpSsE7+Ui7er7BCjSLXdEpS4y\n3PsHKJodAgMBAAECggEAF0eolfCygo2/3Nrsyy0w3keFB6jpnaoyAflM77PBXIPK\n/qvmKudNRcRHrh6Iau1Qn1QyhZeKpk2pcwA9Dm2TNyldt9IO0cHrT3edyzYuq7XJ\nioGuYVRp6+jzm1K6LOBH+fX2pq5CNrEn9z0OOHdenVmIskYZramjD52SArkXXxpn\nelFcAIbAaiqY1OBU0swGadXuhoeC5fqk8axGEF9ZXbf/utXD0mFqhFI3zz9x/gwY\nLzP5Fkd50UQmAb4PE+8q4etjCazvttr9864YlXMTKGwNx8Sh8SehDL4+B56pK1Kr\nano0v+Fj0cHh/UJSJit4RXSJiuxxGGQ5IO7koTWYIQKBgQDjz2BpCZ7OgB2iYsi2\nxZEf8PWWXPpW2aYsn+KcTT4DA1L65aSaWRQVKBUUDHIT7cNzf+wjw7C7Y0ISG2yT\nMfgQbAZMCIzLV3GsM3kV6yqciQczGlp/TqdaJVnGGXPVe5P0sC/Bfwgoi02EkK1K\n+rm/rE5ueT+eHwgxNXeWZcc/8QKBgQDIg3Gltsh8xoMcgbBA/poiCrxSklQ22jq8\nCqzyqrdUDC7pr5hp+DcEjOBiX3j5qp5diSoROrZmYW1go3MG5P6/HR7bitj4feW6\nYl9vblHch9fTaFGsZMJwchjaaN+2RklYUZ6/Nhr4TCnKQgMOyaaCyzCwzDpE2GOX\n1Wktt8Do7QKBgQCKZF+4T6zW3AOks4glaG4aTmKTPtahzkTiFRswQshqQim1264c\nSgMmOxxa+piOvMEguFS3AVmq7MilgV17Kj79kvJcXFFT8kJPD1H+28ceIyxpghf6\nAMkvvUMFUk8JILKoUiQg01AceUvVPaLYyunuo/ldqXDZWRa79jQ4/ImHsQKBgEA1\n75/sr7ldbMElOsclgUBjhbk/iN5j9ikflhDD4J92o1NMWxecWCoJ3xVBk6EIJVy4\nvxLzZVPV4UvwK7bKgFW9QpN1nFO/JWERfZRWlLp1egUGRBlbzvRpZVIUAYgCbBxv\nTtHWxr46zasqhoYmxz7dSMNlM0e2r/YAboUocgtlAoGAZgaKi0hH/JW1cSGTfbMI\n1V4056YtrUgiX5AhKEtfC2sVLC5orwuZmJaa5JjdQT+2PnecMdDmatojDQjklE/e\nvrpopN2oeBDqVA+ofcpVsFxgLTlWRD5uKb027tAcneViRN2CNHlO/Cw4c8ZIG0xe\nQRBL0hYZ7DUaVIdmhvlALMw=",
//     Base64Implementation
// );
// const getFCMAuthToken = async () => {
//     try {
//         const token = await authTokenGetter.getAccessToken();
//         console.log('Got FCM Auth Token:', token);
//         return token;
//     } catch (error) {
//         console.error('Error getting FCM Auth Token:', error);
//     };
// }
