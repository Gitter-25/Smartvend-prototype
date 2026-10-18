/**
 * Shared visual heading for workspace pages.
 */

/**
 * Render the page title and description with consistent styling.
 */
export default function PageHeading({ title, description }) {
  return (
    <div className="page-heading">
      {/* Keep the supplied page title and explanation together in the shared heading layout. */}
      {/* Render the page title supplied by the calling screen. */}
      <h2>{title}</h2>

      {/* Render the supplied short description underneath the title. */}
      <p>{description}</p>
    </div>
  );
}
