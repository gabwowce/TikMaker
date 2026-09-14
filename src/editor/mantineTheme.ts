import {
  ActionIcon,
  Button,
  createTheme,
  Fieldset,
  NativeSelect,
  NumberInput,
  Slider,
  Textarea,
  TextInput,
} from "@mantine/core";
export const mantineTheme = createTheme({
  primaryColor: "orange",
  defaultRadius: "sm",
  fontFamily: "Arial, sans-serif",
  components: {
    Fieldset: Fieldset.extend({ defaultProps: { className: "mt-3 min-w-0" } }),
    Slider: Slider.extend({
      defaultProps: { size: "sm", label: null, className: "my-2" },
    }),
    Button: Button.extend({ defaultProps: { size: "xs" } }),
    ActionIcon: ActionIcon.extend({ defaultProps: { variant: "subtle" } }),
    NativeSelect: NativeSelect.extend({ defaultProps: { size: "xs" } }),
    NumberInput: NumberInput.extend({ defaultProps: { size: "xs" } }),
    Textarea: Textarea.extend({
      defaultProps: { size: "xs", rows: 3, resize: "vertical" },
    }),
    TextInput: TextInput.extend({ defaultProps: { size: "xs" } }),
  },
});
