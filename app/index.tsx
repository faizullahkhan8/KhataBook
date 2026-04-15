import React from "react";
import { Pressable, Switch, Text, TextInput, View } from "react-native";

export default function Index() {
    const [value, setValue] = React.useState(false);

    const handleClick = () => {
        console.log("button pressed");
    };
    return (
        <View>
            <Text>Hello world!</Text>
            <Pressable
                style={{
                    borderWidth: 1,
                    borderRadius: 2,
                    padding: 8,
                    marginTop: 8,
                    marginHorizontal: 8,
                }}
                onPress={handleClick}
            >
                <Text>Click me!</Text>
            </Pressable>
            <Switch value={value} onValueChange={() => setValue(!value)} />
            <TextInput placeholder="hello" keyboardType="ascii-capable" />
        </View>
    );
}
