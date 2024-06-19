class FCMLegacyToV1Converter {
    #Base64Implementation = {
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
    
    #authTokenGetter = new AuthTokenGetter(
        "fcm-sender@join-external-gcm.iam.gserviceaccount.com",
        "MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCybvuSZiNWISfi\nBiCMLXMtak93LGyE3faxnKg7TSvx19YJ0Stcofq7jyuehcHMhoksYVwSzdfYm8yV\nVIliNNVAysdI4bSELR8LTNF7wVzLi1UNfpjQGuxiWS0VIev1WuheqvHIbdiJtD38\ntQ89cGlKLiN5DizQD5cg6GGcyFwZv35jOQAIYuQhhJZWl8RRkemcndiZ+semmf6E\nTeSGnmbyFmhXyWySerdvyj+ZzvoPL4olo5deURlgoCg8uiv8ajVCOdOkOQ/E9J+n\n2yIwvjGk/VSeMxXpzQw+5Qj2/gvtz6ufAlIBDb4HpSsE7+Ui7er7BCjSLXdEpS4y\n3PsHKJodAgMBAAECggEAF0eolfCygo2/3Nrsyy0w3keFB6jpnaoyAflM77PBXIPK\n/qvmKudNRcRHrh6Iau1Qn1QyhZeKpk2pcwA9Dm2TNyldt9IO0cHrT3edyzYuq7XJ\nioGuYVRp6+jzm1K6LOBH+fX2pq5CNrEn9z0OOHdenVmIskYZramjD52SArkXXxpn\nelFcAIbAaiqY1OBU0swGadXuhoeC5fqk8axGEF9ZXbf/utXD0mFqhFI3zz9x/gwY\nLzP5Fkd50UQmAb4PE+8q4etjCazvttr9864YlXMTKGwNx8Sh8SehDL4+B56pK1Kr\nano0v+Fj0cHh/UJSJit4RXSJiuxxGGQ5IO7koTWYIQKBgQDjz2BpCZ7OgB2iYsi2\nxZEf8PWWXPpW2aYsn+KcTT4DA1L65aSaWRQVKBUUDHIT7cNzf+wjw7C7Y0ISG2yT\nMfgQbAZMCIzLV3GsM3kV6yqciQczGlp/TqdaJVnGGXPVe5P0sC/Bfwgoi02EkK1K\n+rm/rE5ueT+eHwgxNXeWZcc/8QKBgQDIg3Gltsh8xoMcgbBA/poiCrxSklQ22jq8\nCqzyqrdUDC7pr5hp+DcEjOBiX3j5qp5diSoROrZmYW1go3MG5P6/HR7bitj4feW6\nYl9vblHch9fTaFGsZMJwchjaaN+2RklYUZ6/Nhr4TCnKQgMOyaaCyzCwzDpE2GOX\n1Wktt8Do7QKBgQCKZF+4T6zW3AOks4glaG4aTmKTPtahzkTiFRswQshqQim1264c\nSgMmOxxa+piOvMEguFS3AVmq7MilgV17Kj79kvJcXFFT8kJPD1H+28ceIyxpghf6\nAMkvvUMFUk8JILKoUiQg01AceUvVPaLYyunuo/ldqXDZWRa79jQ4/ImHsQKBgEA1\n75/sr7ldbMElOsclgUBjhbk/iN5j9ikflhDD4J92o1NMWxecWCoJ3xVBk6EIJVy4\nvxLzZVPV4UvwK7bKgFW9QpN1nFO/JWERfZRWlLp1egUGRBlbzvRpZVIUAYgCbBxv\nTtHWxr46zasqhoYmxz7dSMNlM0e2r/YAboUocgtlAoGAZgaKi0hH/JW1cSGTfbMI\n1V4056YtrUgiX5AhKEtfC2sVLC5orwuZmJaa5JjdQT+2PnecMdDmatojDQjklE/e\nvrpopN2oeBDqVA+ofcpVsFxgLTlWRD5uKb027tAcneViRN2CNHlO/Cw4c8ZIG0xe\nQRBL0hYZ7DUaVIdmhvlALMw=",
        this.#Base64Implementation
    );
    #removeUndefinedKeys(obj){
        if (obj && typeof obj === 'object') {
            return Object.keys(obj).reduce((acc, key) => {
                const value = obj[key];
                if (value !== undefined) {
                    acc[key] = this.#removeUndefinedKeys(value);
                }
                return acc;
            }, Array.isArray(obj) ? [] : {});
        }
        return obj;
    };
    convertGcmFromLegacyToV1(legacyGcm) {
        const validate_only = legacyGcm.dry_run;
        const priority = legacyGcm.priority;
        const ttl = legacyGcm.ttl;
        const collapse_key = legacyGcm.collapse_key;
        const restricted_package_name = legacyGcm.restricted_package_name;
        const data = legacyGcm.data;
        const registration_ids = legacyGcm.registration_ids; //single devices
        const to = legacyGcm.to; //topic
        const buildMessage = () => {
            const message = {
                validate_only,
                "message": {
                    "android": {
                        priority,
                        ttl,
                        collapse_key,
                        restricted_package_name
                    },
                    data
                }
            }
            return this.#removeUndefinedKeys(message);
        }
        const buildTopicMessages = () => {
            const baseMessage = buildMessage();
            baseMessage.message.to = to;
            return [baseMessage];
        }
        const buildDeviceMessages = () => {
            const messages = registration_ids.map(registration_id => {
                const deviceMessage = buildMessage();
                deviceMessage.message.token = registration_id;
                return deviceMessage;
            });
            return messages;
        }
        const resultList = to ? buildTopicMessages() : buildDeviceMessages();
        console.log("v1 messages", resultList);
        return resultList;
    }
    async doV1DirectGCMRequests(requests) {

        const token = await this.#authTokenGetter.getAccessToken();
        const fetches = requests.map(request => {
            const body = JSON.stringify(request);
            return fetch("https://fcm.googleapis.com/v1/projects/join-external-gcm/messages:send", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body
            });
        });
        const result = await Promise.allSettled(fetches);
        const resultJsons = await Promise.all(result.map(async (r) => {
            if (r.status === "fulfilled") {
                return r.value.json();
            } else {
                console.error("V1 FCM Fetch error:", r.reason);
                return null;
            }
        }));
        console.log(resultJsons);
        return resultJsons;
    }

    convertGcmResponseV1ToLegacy(v1Responses) {
        if (v1Responses.filter(response => response == null).length > 0) throw Error("Couldn't get response from v1 FCM");

        const multicast_id = Math.floor(Math.random() * 1000000000000000000);
        const success = v1Responses.filter(response => response.name).length;
        const failure = v1Responses.filter(response => response.error).length;
        const canonical_ids = 0;
        const results = v1Responses.map(response => {
            if (response.name) {
                const parts = response.name.split('/');
                return { "message_id": parts[parts.length - 1] };
            } else {
                return { "error": response.error.message };
            }
        });
        return {
            multicast_id,
            success,
            failure,
            canonical_ids,
            results
        }
    }

    async doLegacyRequest(legacyContent) {
        const contentv1 = this.convertGcmFromLegacyToV1(legacyContent);
        const v1Responses = await this.doV1DirectGCMRequests(contentv1);
        const legacyResponses = this.convertGcmResponseV1ToLegacy(v1Responses);
        return legacyResponses;
    }
}