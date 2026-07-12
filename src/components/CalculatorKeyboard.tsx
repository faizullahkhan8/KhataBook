import { Ionicons } from "@expo/vector-icons";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { LayoutChangeEvent, Pressable, StyleSheet, View } from "react-native";
import { Typography } from "./Typography";
import { Spacing } from "../constants";
import { useTheme } from "../store";
import { formatCurrency, toInteger } from "../utils/currencyUtils";

const KEYS = [
    ["C", "÷", "×", "DEL"],
    ["7", "8", "9", "-"],
    ["4", "5", "6"],
    ["1", "2", "3"],
    ["00", "0", ".", "="],
] as const;

type Digit = "0" | "00" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
type Operator = "+" | "-" | "×" | "÷";
type ActionKey = "C" | "DEL" | "=" | ".";
type KeyValue = Digit | Operator | ActionKey;

const MAX_DIGITS = 12;
const OPERATORS: Operator[] = ["+", "-", "×", "÷"];
const OPERATOR_SET = new Set<string>(OPERATORS);

const isOperator = (key: string): key is Operator => OPERATOR_SET.has(key);
const lastCharIsOperator = (expr: string) =>
    expr.length > 0 && OPERATOR_SET.has(expr[expr.length - 1]);

/**
 * Returns the last numeric token in the expression (the one currently being
 * typed). If the expression ends with an operator, an empty string is returned.
 */
const getLastNumber = (expr: string): string => {
    const match = expr.match(/(\d*\.?\d*)$/);
    return match ? match[1] : "";
};

/**
 * Counts only the digits in the current operand to enforce max length.
 */
const digitCount = (numStr: string) => numStr.replace(/[^0-9]/g, "").length;

/**
 * Formats a raw numeric string with thousands separators while preserving any
 * trailing decimal point or digits.
 */
const formatNumberString = (numStr: string): string => {
    if (numStr === "" || numStr === ".") return numStr;
    const [intPart, decPart] = numStr.split(".");
    const intValue = intPart ? parseInt(intPart, 10) : 0;
    const formattedInt = intValue.toLocaleString("en-PK");
    return decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
};

/**
 * Formats the full expression by adding thousands separators to every number.
 */
const formatExpression = (expr: string): string => {
    return expr.replace(/(\d*\.?\d+)/g, (match) => formatNumberString(match));
};

const tokenize = (expr: string): (number | string)[] => {
    const tokens: (number | string)[] = [];
    let num = "";
    for (const char of expr) {
        if (/[0-9.]/.test(char)) {
            num += char;
        } else if (/[+\-×÷()]/.test(char)) {
            if (num) {
                const value = parseFloat(num);
                if (!isNaN(value)) tokens.push(value);
                num = "";
            }
            tokens.push(char === "×" ? "*" : char === "÷" ? "/" : char);
        }
    }
    if (num) {
        const value = parseFloat(num);
        if (!isNaN(value)) tokens.push(value);
    }
    return tokens;
};

const evaluateTokens = (tokens: (number | string)[]): number | null => {
    if (tokens.length === 0) return null;

    // First pass: resolve * and / left-to-right.
    const stack: (number | string)[] = [];
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (token === "*" || token === "/") {
            const prev = stack.pop();
            const next = tokens[i + 1];
            if (typeof prev !== "number" || typeof next !== "number") {
                return null;
            }
            if (token === "/" && next === 0) return null;
            stack.push(token === "*" ? prev * next : prev / next);
            i++;
        } else {
            stack.push(token);
        }
    }

    // Second pass: resolve + and - left-to-right.
    let result = stack[0];
    if (typeof result !== "number") return null;
    for (let i = 1; i < stack.length; i += 2) {
        const op = stack[i];
        const next = stack[i + 1];
        if (typeof next !== "number") return null;
        if (op === "+") result += next;
        else if (op === "-") result -= next;
        else return null;
    }

    return isFinite(result) ? result : null;
};

const evaluate = (expr: string): number | null => {
    if (!expr.trim()) return null;
    const tokens = tokenize(expr);
    if (tokens.length === 0) return null;
    return evaluateTokens(tokens);
};

export interface CalculatorKeyboardProps {
    onAmountChange: (
        amount: number,
        display: string,
        preview: string | null,
    ) => void;
    hidden?: boolean;
    initialValue?: number;
}

const CalculatorKeyboardComponent: React.FC<CalculatorKeyboardProps> = ({
    onAmountChange,
    hidden,
    initialValue,
}) => {
    const { colors } = useTheme();

    const [expression, setExpression] = useState(() => {
        if (!initialValue || initialValue <= 0) return "";
        return initialValue.toString();
    });
    const [evaluated, setEvaluated] = useState<number | null>(null);
    const [resetNext, setResetNext] = useState(false);
    const [error, setError] = useState(false);
    const [keyWidth, setKeyWidth] = useState(0);
    const keyWidthRef = useRef(keyWidth);
    keyWidthRef.current = keyWidth;

    const amount = useMemo(() => {
        if (error) return 0;
        if (evaluated !== null) return evaluated;
        if (!expression.trim()) return 0;
        const parsed = parseFloat(expression);
        return isNaN(parsed) ? 0 : parsed;
    }, [expression, evaluated, error]);

    const displayAmount = useMemo(() => {
        if (error) return "Error";
        if (evaluated !== null) return formatNumberString(evaluated.toString());
        if (!expression.trim()) return "";
        return formatExpression(expression);
    }, [expression, evaluated, error]);

    const previewAmount = useMemo(() => {
        if (error || !expression.trim()) return null;
        if (!/[+\-×÷]/.test(expression)) return null;
        const result = evaluate(expression);
        if (result === null) return null;
        return formatCurrency(toInteger(result) as any);
    }, [expression, error]);

    const lastChangeRef = useRef<{
        amount: number;
        displayAmount: string;
        previewAmount: string | null;
    } | null>(null);

    useEffect(() => {
        const last = lastChangeRef.current;
        if (
            last &&
            last.amount === amount &&
            last.displayAmount === displayAmount &&
            last.previewAmount === previewAmount
        ) {
            return;
        }

        lastChangeRef.current = { amount, displayAmount, previewAmount };
        onAmountChange(amount, displayAmount, previewAmount);
    }, [amount, displayAmount, previewAmount, onAmountChange]);

    const appendDigit = useCallback(
        (key: Digit) => {
            setError(false);
            setExpression((prev) => {
                if (resetNext) {
                    setResetNext(false);
                    setEvaluated(null);
                    return key === "00" ? "0" : key;
                }

                const lastNum = getLastNumber(prev);
                if (digitCount(lastNum) >= MAX_DIGITS) return prev;

                // Prevent leading zeros like "01", "00" duplication.
                if (prev === "0") {
                    if (key === "0" || key === "00") return prev;
                    return key;
                }

                // If expression is empty, "00" becomes "0".
                if (prev === "" && key === "00") return "0";

                return prev + key;
            });
        },
        [resetNext],
    );

    const appendDecimal = useCallback(() => {
        setError(false);
        setExpression((prev) => {
            if (resetNext) {
                setResetNext(false);
                setEvaluated(null);
                return "0.";
            }

            const lastNum = getLastNumber(prev);
            if (lastNum.includes(".")) return prev;

            // Start a new operand after an operator with "0.".
            if (prev === "" || lastCharIsOperator(prev)) {
                return prev + "0.";
            }

            return prev + ".";
        });
    }, [resetNext]);

    const appendOperator = useCallback(
        (key: Operator) => {
            setError(false);
            setExpression((prev) => {
                setResetNext(false);

                // Continue calculation from a previous result.
                if (prev === "" && evaluated !== null) {
                    setEvaluated(null);
                    return evaluated.toString() + key;
                }

                if (prev === "") return prev;

                // Replace the last operator if one is already present.
                if (lastCharIsOperator(prev)) {
                    return prev.slice(0, -1) + key;
                }

                return prev + key;
            });
        },
        [evaluated],
    );

    const calculate = useCallback(() => {
        setExpression((prev) => {
            if (!prev.trim()) return prev;

            const result = evaluate(prev);
            if (result === null) {
                setError(true);
                return prev;
            }

            setEvaluated(result);
            setResetNext(true);
            return "";
        });
    }, []);

    const clear = useCallback(() => {
        setExpression("");
        setEvaluated(null);
        setResetNext(false);
        setError(false);
    }, []);

    const backspace = useCallback(() => {
        setError(false);
        setExpression((prev) => {
            if (resetNext) {
                setResetNext(false);
                setEvaluated(null);
                return "";
            }
            return prev.slice(0, -1);
        });
    }, [resetNext]);

    const handleKeyPress = useCallback(
        (key: KeyValue) => {
            if (key === "C") {
                clear();
                return;
            }
            if (key === "DEL") {
                backspace();
                return;
            }
            if (key === "=") {
                calculate();
                return;
            }
            if (key === ".") {
                appendDecimal();
                return;
            }
            if (isOperator(key)) {
                appendOperator(key);
                return;
            }
            appendDigit(key);
        },
        [
            appendDigit,
            appendDecimal,
            appendOperator,
            calculate,
            clear,
            backspace,
        ],
    );

    const renderKey = (keyVal: KeyValue, ri: number) => {
        const isOperatorKey = isOperator(keyVal);
        const isEquals = keyVal === "=";
        const isClear = keyVal === "C";
        const isDel = keyVal === "DEL";
        const isAction = isOperatorKey || isEquals || isClear || isDel;

        const handleLayout =
            ri === 0 && keyVal === "C"
                ? (e: LayoutChangeEvent) => {
                      const w = e.nativeEvent.layout.width;
                      if (w > 0 && Math.abs(w - keyWidthRef.current) > 1) {
                          setKeyWidth(w);
                      }
                  }
                : undefined;

        return (
            <Pressable
                key={keyVal}
                onLayout={handleLayout}
                style={[
                    styles.calcKey,
                    isEquals && { backgroundColor: colors.success },
                    isClear && { backgroundColor: colors.danger },
                    (isOperatorKey || isDel) && {
                        backgroundColor: colors.primary + "E0",
                    },
                    !isAction && {
                        backgroundColor: colors.background,
                        borderWidth: 1,
                        borderColor: colors.border,
                    },
                ]}
                onPress={() => handleKeyPress(keyVal)}
                accessibilityRole="button"
                accessibilityLabel={
                    isDel ? "Backspace" : keyVal === "=" ? "Equals" : keyVal
                }
            >
                {isDel ? (
                    <Ionicons
                        name="backspace-outline"
                        size={22}
                        color="#FFFFFF"
                    />
                ) : (
                    <Typography
                        variant="heading-medium"
                        color="primary"
                        style={isAction ? styles.actionText : undefined}
                    >
                        {keyVal}
                    </Typography>
                )}
            </Pressable>
        );
    };

    if (hidden) return null;

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: colors.surface,
                    borderTopColor: colors.border,
                    paddingTop: Spacing.sm,
                    paddingBottom: Spacing.xs,
                    paddingHorizontal: Spacing.md,
                },
            ]}
        >
            <View style={styles.calculatorGrid}>
                {KEYS.map((row, ri) => {
                    if (ri === 3) return null;

                    if (ri === 2) {
                        return (
                            <View key="rowspan" style={styles.spanRow}>
                                <View style={styles.spanLeft}>
                                    <View style={styles.calcRow}>
                                        {KEYS[2].map((k) => renderKey(k, 2))}
                                    </View>
                                    <View style={styles.calcRow}>
                                        {KEYS[3].map((k) => renderKey(k, 3))}
                                    </View>
                                </View>
                                <Pressable
                                    style={[
                                        styles.spanRight,
                                        keyWidth > 0 && {
                                            width: keyWidth,
                                            flex: 0,
                                        },
                                        {
                                            backgroundColor:
                                                colors.primary + "E0",
                                        },
                                    ]}
                                    onPress={() => handleKeyPress("+")}
                                    accessibilityRole="button"
                                    accessibilityLabel="Plus"
                                >
                                    <Typography
                                        variant="heading-medium"
                                        color="primary"
                                        style={styles.actionText}
                                    >
                                        +
                                    </Typography>
                                </Pressable>
                            </View>
                        );
                    }

                    return (
                        <View key={ri} style={styles.calcRow}>
                            {row.map((k) => renderKey(k, ri))}
                        </View>
                    );
                })}
            </View>
        </View>
    );
};

export const CalculatorKeyboard = React.memo(CalculatorKeyboardComponent);

const styles = StyleSheet.create({
    container: {
        borderTopWidth: 1,
        paddingTop: Spacing.sm,
    },
    calculatorGrid: {
        gap: Spacing.sm,
    },
    calcRow: {
        flexDirection: "row",
        gap: Spacing.sm,
    },
    spanRow: {
        flexDirection: "row",
        gap: Spacing.sm,
    },
    spanLeft: {
        flex: 3,
        gap: Spacing.sm,
    },
    spanRight: {
        flex: 1,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        minHeight: 56,
    },
    calcKey: {
        flex: 1,
        minHeight: 52,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: Spacing.sm,
    },
    actionText: {
        color: "#FFFFFF",
    },
});
