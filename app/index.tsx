import { AppNavigator } from "@/navigation/AppNavigator";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import React, { useEffect } from "react";

export default function Index() {
    useEffect(() => {
        GoogleSignin.configure({
            webClientId:
                "72923726304-dsrl0chdmjv6k0dloh487mtrq1avc1vn.apps.googleusercontent.com",
            iosClientId:
                "72923726304-d6uiitli0gf9no335r98dtpvtmic9tnd.apps.googleusercontent.com",
            profileImageSize: 150,
        });
    }, []);

    return <AppNavigator />;
}
