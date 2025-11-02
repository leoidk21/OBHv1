import Svg, { Path } from "react-native-svg";

export const BudgetIcon = ({ color = "gray" }: { color?: string }) => (
  <Svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    preserveAspectRatio="xMidYMid meet"
  >
    <Path
      d="M19.7779 4.22232C24.074 8.51767 24.074 15.4821 19.7779 19.7779C15.4822 24.0743 8.51741 24.0743 4.22205 19.7779C-0.074017 15.4825 -0.074017 8.51803 4.22205 4.22232C8.51741 -0.0741055 15.4819 -0.0741055 19.7779 4.22232Z"
      stroke={color}
      stroke-width="2"
      stroke-miterlimit="10"
    />
    <Path
      d="M9.16089 17.6777V6.32275"
      stroke={color}
      stroke-width="2"
      stroke-miterlimit="10"
    />
    <Path
      d="M9.16089 6.67709H11.6448C11.6448 6.67709 15.548 6.32225 15.548 9.87067C15.548 13.4191 11.6448 13.0642 11.6448 13.0642H9.16089"
      stroke={color}
      stroke-width="2"
      stroke-miterlimit="10"
    />
    <Path
      d="M7.38672 9.1615H17.3223"
      stroke={color}
      stroke-width="2"
      stroke-miterlimit="10"
    />
    <Path
      d="M7.38672 10.5808H17.3223"
      stroke={color}
      stroke-width="2"
      stroke-miterlimit="10"
    />
  </Svg>
);
