declare module 'react-native-check-box' {
  import * as React from 'react';
  import { ViewStyle, TextStyle } from 'react-native';

  export interface CheckBoxProps {
    style?: ViewStyle;
    onClick?: () => void;
    isChecked?: boolean;
    rightText?: string;
    rightTextStyle?: TextStyle;
    checkedImage?: React.ReactNode;
    unCheckedImage?: React.ReactNode;
    disabled?: boolean;
  }

  export default class CheckBox extends React.Component<CheckBoxProps> {}
}