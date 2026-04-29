import { createContext, useContext } from "react";
import { useMockData } from "../../context/MockDataContext.jsx";

const OrderContext = createContext(null);

export function OrderProvider({ children }) {
  const {
    orders,
    addOrder,
    cancelOrder,
    approveOrder,
    rejectOrder,
    shipOrder,
    deliverOrder,
    getOrder,
    returns,
    addReturn,
    updateReturn,
    getReturn,
  } = useMockData();

  return (
    <OrderContext.Provider
      value={{
        orders,
        addOrder,
        cancelOrder,
        approveOrder,
        rejectOrder,
        shipOrder,
        deliverOrder,
        getOrder,
        returns,
        addReturn,
        updateReturn,
        getReturn,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders() {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error("useOrders() must be used inside <OrderProvider>");
  }
  return context;
}
