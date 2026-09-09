package com.fadfada.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.revenuecat.purchases.CustomerInfo;
import com.revenuecat.purchases.EntitlementInfo;
import com.revenuecat.purchases.Offering;
import com.revenuecat.purchases.Offerings;
import com.revenuecat.purchases.Package;
import com.revenuecat.purchases.Purchases;
import com.revenuecat.purchases.PurchasesConfiguration;
import com.revenuecat.purchases.PurchasesError;
import com.revenuecat.purchases.galaxy.GalaxyConfiguration;
import com.revenuecat.purchases.interfaces.LogInCallback;
import com.revenuecat.purchases.interfaces.PurchaseCallback;
import com.revenuecat.purchases.interfaces.ReceiveCustomerInfoCallback;
import com.revenuecat.purchases.interfaces.ReceiveOfferingsCallback;
import com.revenuecat.purchases.models.Price;
import com.revenuecat.purchases.models.StoreProduct;
import com.revenuecat.purchases.models.StoreTransaction;

import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(name = "FadfadaRevenueCat")
public class FadfadaRevenueCatPlugin extends Plugin {

    @PluginMethod
    public void configure(PluginCall call) {
        String apiKey = call.getString("apiKey");
        if (apiKey == null || apiKey.isEmpty()) {
            call.reject("apiKey is required");
            return;
        }
        String userKey = call.getString("userKey");

        PurchasesConfiguration config = new GalaxyConfiguration.Builder(getContext(), apiKey).build();
        Purchases.configure(config);

        if (userKey != null && !userKey.isEmpty()) {
            logIn(userKey, call);
        } else {
            call.resolve(new JSObject().put("ok", true));
        }
    }

    @PluginMethod
    public void setUserId(PluginCall call) {
        String userKey = call.getString("userKey");
        if (userKey == null || userKey.isEmpty()) {
            call.reject("userKey is required");
            return;
        }
        logIn(userKey, call);
    }

    @PluginMethod
    public void getOfferings(PluginCall call) {
        Purchases.getSharedInstance().getOfferings(new ReceiveOfferingsCallback() {
            @Override
            public void onReceived(Offerings offerings) {
                JSObject result = new JSObject();
                result.put("current", offeringToJson(offerings.getCurrent()));
                JSONObject all = new JSONObject();
                if (offerings.getAll() != null) {
                    for (String id : offerings.getAll().keySet()) {
                        all.put(id, offeringToJson(offerings.getAll().get(id)));
                    }
                }
                result.put("all", all);
                call.resolve(result);
            }

            @Override
            public void onError(PurchasesError error) {
                call.reject(error.getMessage(), String.valueOf(error.getCode().getCode()));
            }
        });
    }

    @PluginMethod
    public void purchase(PluginCall call) {
        String offeringId = call.getString("offeringIdentifier");
        String packageId = call.getString("packageIdentifier");
        if (packageId == null || packageId.isEmpty()) {
            call.reject("packageIdentifier is required");
            return;
        }
        Purchases.getSharedInstance().getOfferings(new ReceiveOfferingsCallback() {
            @Override
            public void onReceived(Offerings offerings) {
                Offering offering = (offeringId != null && !offeringId.isEmpty())
                        ? offerings.get(offeringId)
                        : offerings.getCurrent();
                if (offering == null) {
                    call.reject("Offering not found: " + offeringId);
                    return;
                }
                Package pkg = null;
                for (Package candidate : offering.getAvailablePackages()) {
                    if (candidate.getIdentifier().equals(packageId)) {
                        pkg = candidate;
                        break;
                    }
                }
                if (pkg == null) {
                    call.reject("Package not found: " + packageId);
                    return;
                }
                Purchases.getSharedInstance().purchasePackage(getActivity(), pkg, new PurchaseCallback() {
                    @Override
                    public void onCompleted(StoreTransaction storeTransaction, CustomerInfo customerInfo) {
                        JSObject result = new JSObject();
                        result.put("customerInfo", customerInfoToJson(customerInfo));
                        call.resolve(result);
                    }

                    @Override
                    public void onError(PurchasesError error, boolean userCancelled) {
                        JSObject result = new JSObject();
                        result.put("userCancelled", userCancelled);
                        result.put("message", error.getMessage());
                        call.reject("Purchase failed", String.valueOf(error.getCode().getCode()), result);
                    }
                });
            }

            @Override
            public void onError(PurchasesError error) {
                call.reject(error.getMessage(), String.valueOf(error.getCode().getCode()));
            }
        });
    }

    @PluginMethod
    public void getCustomerInfo(PluginCall call) {
        Purchases.getSharedInstance().getCustomerInfo(new ReceiveCustomerInfoCallback() {
            @Override
            public void onReceived(CustomerInfo customerInfo) {
                call.resolve(customerInfoToJson(customerInfo));
            }

            @Override
            public void onError(PurchasesError error) {
                call.reject(error.getMessage(), String.valueOf(error.getCode().getCode()));
            }
        });
    }

    @PluginMethod
    public void restorePurchases(PluginCall call) {
        Purchases.getSharedInstance().restorePurchases(new ReceiveCustomerInfoCallback() {
            @Override
            public void onReceived(CustomerInfo customerInfo) {
                call.resolve(customerInfoToJson(customerInfo));
            }

            @Override
            public void onError(PurchasesError error) {
                call.reject(error.getMessage(), String.valueOf(error.getCode().getCode()));
            }
        });
    }

    private void logIn(String userKey, PluginCall call) {
        Purchases.getSharedInstance().logIn(userKey, new LogInCallback() {
            @Override
            public void onReceived(CustomerInfo customerInfo, boolean created) {
                JSObject result = new JSObject();
                result.put("ok", true);
                result.put("created", created);
                result.put("customerInfo", customerInfoToJson(customerInfo));
                call.resolve(result);
            }

            @Override
            public void onError(PurchasesError error) {
                call.reject(error.getMessage(), String.valueOf(error.getCode().getCode()));
            }
        });
    }

    private JSONObject offeringToJson(Offering offering) {
        JSONObject json = new JSONObject();
        if (offering == null) {
            return json;
        }
        json.put("identifier", offering.getIdentifier());
        json.put("serverDescription", offering.getServerDescription());
        JSONArray packages = new JSONArray();
        for (Package pkg : offering.getAvailablePackages()) {
            packages.put(packageToJson(pkg));
        }
        json.put("availablePackages", packages);
        return json;
    }

    private JSONObject packageToJson(Package pkg) {
        JSONObject json = new JSONObject();
        json.put("identifier", pkg.getIdentifier());
        json.put("packageType", pkg.getPackageType() != null ? pkg.getPackageType().toString() : null);
        json.put("offeringIdentifier", pkg.getOffering());
        StoreProduct product = pkg.getProduct();
        if (product != null) {
            json.put("productId", product.getId());
            json.put("title", product.getTitle());
            json.put("type", product.getType().toString());
            Price price = product.getPrice();
            if (price != null) {
                json.put("priceFormatted", price.getFormatted());
                json.put("priceAmountMicros", price.getAmountMicros());
                json.put("currencyCode", price.getCurrencyCode());
            }
        }
        return json;
    }

    private JSONObject customerInfoToJson(CustomerInfo customerInfo) {
        JSONObject json = new JSONObject();
        JSONObject entitlements = new JSONObject();
        if (customerInfo.getEntitlements() != null) {
            for (String id : customerInfo.getEntitlements().keySet()) {
                EntitlementInfo info = customerInfo.getEntitlements().get(id);
                JSONObject e = new JSONObject();
                e.put("isActive", info.isActive());
                e.put("willRenew", info.getWillRenew());
                e.put("productIdentifier", info.getProductIdentifier());
                e.put("productPlanIdentifier", info.getProductPlanIdentifier());
                e.put("expirationDate", info.getExpirationDate() != null ? info.getExpirationDate().getTime() : null);
                entitlements.put(id, e);
            }
        }
        json.put("entitlements", entitlements);
        json.put("activeSubscriptions", new JSONArray(customerInfo.getActiveSubscriptions()));
        json.put("activeEntitlements", new JSONArray(customerInfo.getActiveEntitlements()));
        return json;
    }
}
