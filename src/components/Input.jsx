/**
 * Shared form field that links its label to the input ID and forwards validation and
 * accessibility properties.
 */

/**
 * Render an input with its associated label; pass the remaining properties to the input.
 */
export default function Input({ label, id, ...props }) {
  return (
    <label htmlFor={id}>
      {label}
      <input id={id} {...props} />
    </label>
  );
}
