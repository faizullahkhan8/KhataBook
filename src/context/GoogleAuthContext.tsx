import AsyncStorage from "@react-native-async-storage/async-storage";
import { GoogleSignin, User } from "@react-native-google-signin/google-signin";
import React, {
    ReactNode,
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

interface GoogleAuthContextType {
    userInfo: User["user"] | null;
    lastBackupTime: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: () => Promise<User["user"] | null>;
    logout: () => Promise<void>;
    updateBackupTimestamp: () => Promise<void>;
}

const GoogleAuthContext = createContext<GoogleAuthContextType | undefined>(
    undefined,
);

const STORAGE_KEYS = {
    accountInfo: "@khatabook/google_account",
    lastBackup: "@khatabook/last_backup_time",
};

const GOOGLE_WEB_CLIENT_ID =
    "72923726304-dsrl0chdmjv6k0dloh487mtrq1avc1vn.apps.googleusercontent.com";

const GOOGLE_IOS_CLIENT_ID =
    "72923726304-d6uiitli0gf9no335r98dtpvtmic9tnd.apps.googleusercontent.com";

export const GoogleAuthProvider: React.FC<{ children: ReactNode }> = ({
    children,
}) => {
    const [userInfo, setUserInfo] = useState<User["user"] | null>(null);
    const [lastBackupTime, setLastBackupTime] = useState<String | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const initializeAuth = async () => {
            try {
                GoogleSignin.configure({
                    scopes: ["https://www.googleapis.com/auth/drive.appdata"],
                    webClientId: GOOGLE_WEB_CLIENT_ID,
                    iosClientId: GOOGLE_IOS_CLIENT_ID,
                    profileImageSize: 150,
                    offlineAccess: true, // required to get a refresh token
                });

                const [savedAccount, savedTimestamp] = await Promise.all([
                    AsyncStorage.getItem(STORAGE_KEYS.accountInfo),
                    AsyncStorage.getItem(STORAGE_KEYS.lastBackup),
                ]);

                if (savedAccount) {
                    try {
                        const response = await GoogleSignin.signInSilently();
                        if (response.type === "success") {
                            const userProfile = response.data.user;
                            setUserInfo(userProfile);
                            // Refresh stored info
                            await AsyncStorage.setItem(STORAGE_KEYS.accountInfo, JSON.stringify(userProfile));
                        } else {
                            // Session expired
                            setUserInfo(null);
                            await AsyncStorage.removeItem(STORAGE_KEYS.accountInfo);
                        }
                    } catch (e) {
                        setUserInfo(JSON.parse(savedAccount));
                    }
                }
                
                if (savedTimestamp) setLastBackupTime(savedTimestamp as string);
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };
        initializeAuth();
    }, []);

    const login = async () => {
        try {
            setIsLoading(true);
            await GoogleSignin.hasPlayServices({
                showPlayServicesUpdateDialog: true,
            });
            const response = await GoogleSignin.signIn();
            
            if (response.type === "success") {
                const userProfile = response.data.user;

                await AsyncStorage.setItem(
                    STORAGE_KEYS.accountInfo,
                    JSON.stringify(userProfile),
                );
                setUserInfo(userProfile);
                return userProfile;
            } else if (response.type === "cancelled") {
                console.log("User cancelled sign in");
                return null;
            }
            return null;
        } catch (error) {
            console.error(error);
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        try {
            setIsLoading(true);
            await GoogleSignin.signOut();
            await AsyncStorage.removeItem(STORAGE_KEYS.accountInfo);
            setUserInfo(null);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const updateBackupTimestamp = async () => {
        const now = new Date().toISOString();
        await AsyncStorage.setItem(STORAGE_KEYS.lastBackup, now);
        setLastBackupTime(now);
    };

    const value = useMemo(
        () => ({
            userInfo,
            lastBackupTime,
            isAuthenticated: !!userInfo,
            isLoading,
            login,
            logout,
            updateBackupTimestamp,
        }),
        [userInfo, lastBackupTime, isLoading],
    );

    return (
        <GoogleAuthContext.Provider value={value}>
            {children}
        </GoogleAuthContext.Provider>
    );
};

export const useGoogleAuth = () => {
    const context = useContext(GoogleAuthContext);
    if (!context)
        throw new Error(
            "useGoogleAuth must be used within a GoogleAuthProvider",
        );
    return context;
};
