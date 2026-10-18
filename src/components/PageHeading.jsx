/**
 * Shared visual heading for workspace pages.
 */

/**
 * Render the page title and description with consistent styling.
 */
export default function PageHeading({ title, description }) {
  return (
    <div className="page-heading">
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}
