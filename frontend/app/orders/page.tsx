import { getOrders, getRoutines, toProduct } from "@/lib/api"
import ProductCard from "@/components/home/ProductCard"

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  })
}

export default async function OrdersPage() {
  const [ordersData, routinesData] = await Promise.all([
    getOrders("u001", 20).catch(() => ({ orders: [], total: 0 })),
    getRoutines("u001").catch(() => ({ routines: [] })),
  ])

  const { orders } = ordersData
  const { routines } = routinesData

  return (
    <div className="bg-[#f0f2f2] min-h-screen">
      <div className="px-3 pt-5 pb-2">
        <h2 className="text-xl font-bold text-[#0f1111]">Order Again</h2>
        <p className="text-sm text-[#565959]">Your routines &amp; past orders</p>
      </div>

      {/* Routines */}
      {routines.length > 0 && (
        <section className="bg-white mt-2 px-3 py-4">
          <p className="text-[11px] text-[#888c8c] uppercase tracking-widest mb-3 font-semibold">
            Your Routines
          </p>
          <div className="space-y-3">
            {routines.map((routine) => (
              <div key={routine.id} className="border border-[#e3e6e6] rounded-2xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-[13px] font-bold text-[#0f1111]">{routine.label}</p>
                    <p className="text-[11px] text-[#888c8c]">{routine.time_of_day}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-[#888c8c]">
                      {Math.round(routine.confidence * 100)}% match
                    </span>
                    <button className="bg-[#ff9900] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg">
                      Reorder
                    </button>
                  </div>
                </div>
                {routine.products.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    {routine.products.map((p) => (
                      <ProductCard key={p.id} product={toProduct(p)} size="sm" />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Order history */}
      <section className="bg-white mt-2 px-3 py-4">
        <p className="text-[11px] text-[#888c8c] uppercase tracking-widest mb-3 font-semibold">
          Previously Bought
        </p>

        {orders.length === 0 ? (
          <p className="text-sm text-[#888c8c] text-center py-8">No orders yet</p>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div key={order.order_id} className="border border-[#e3e6e6] rounded-2xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-[12px] font-semibold text-[#0f1111]">
                      {formatDate(order.placed_at)}
                    </p>
                    <p className="text-[11px] text-[#888c8c]">
                      {order.items.length} item{order.items.length > 1 ? "s" : ""} · ₹{order.total}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#067d62] font-semibold bg-[#f0fff4] px-2 py-0.5 rounded-full">
                      {order.status}
                    </span>
                    <button className="text-[11px] font-bold text-[#ff9900] border border-[#ff9900] px-2.5 py-1 rounded-lg">
                      Reorder
                    </button>
                  </div>
                </div>
                <div className="text-[11px] text-[#565959] space-y-0.5">
                  {order.items.map((item, i) => (
                    <p key={i}>{item.name} × {item.quantity}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="h-20" />
    </div>
  )
}
