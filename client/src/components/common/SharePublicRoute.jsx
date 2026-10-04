import { useParams } from 'react-router-dom';
import SharePublicView from './SharePublicView';

const SharePublicRoute = () => {
  const { token } = useParams();
  return <SharePublicView token={token} />;
};

export default SharePublicRoute;
