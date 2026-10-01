const Skeleton = ({ className = '' }) => (
  <span className={`skeleton-pulse ${className}`} aria-hidden="true" />
);

export default Skeleton;