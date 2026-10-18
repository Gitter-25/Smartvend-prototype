/**
 * Shared button styling with a default button type; individual forms explicitly pass
 * type="submit" where needed.
 */

/**
 * Render the shared button; callers can pass an onClick handler, disabled state, or submit type.
 */
export default function Button({ children, ...props }) {
  return (
    <button type="button" {...props}>
      {children}
    </button>
  );
}
