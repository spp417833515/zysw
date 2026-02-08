import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Spin } from 'antd';

/**
 * Legacy route handler: /transaction/:id
 * Redirects to /transaction and opens the detail drawer via location state.
 */
const TransactionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/transaction', {
      replace: true,
      state: { openDetailId: id },
    });
  }, [id, navigate]);

  return <Spin style={{ display: 'block', margin: '200px auto' }} />;
};

export default TransactionDetail;
