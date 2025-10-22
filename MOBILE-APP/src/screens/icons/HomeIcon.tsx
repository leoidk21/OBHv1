import Svg, { Path } from "react-native-svg";

type IconProps = {
  color?: string;
};

export const HomeIcon = ({ color = "gray" }: IconProps) => (
    <Svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      preserveAspectRatio="xMidYMidMeet"
    >
      <Path
        d="M15.3 19H12H8.69995"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M23 12.2243V13.8975C23 18.1884 23 20.3339 21.7112 21.6669C20.4226 23 18.3483 23 14.2 23H9.8C5.65164 23 3.57747 23 2.28873 21.6669C1 20.3339 1 18.1884 1 13.8975V12.2243C1 9.70704 1 8.44841 1.57112 7.40501C2.14224 6.36163 3.18564 5.71406 5.27243 4.41894L7.47243 3.05356C9.67833 1.68452 10.7813 1 12 1C13.2187 1 14.3217 1.68452 16.5276 3.05356L18.7276 4.41893C20.8144 5.71406 21.8578 6.36163 22.4289 7.40501"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
);

