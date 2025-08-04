import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { supabase, SalesTransaction } from '../../lib/supabase';
import { generateReceipt, generateReceiptHTML, ReceiptData } from '../../lib/receiptGenerator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Icon from '../../components/Icon';

interface ReceiptScreenProps {
  navigation: {
    goBack: () => void;
  };
  route: {
    params: {
      transactionId: string;
    };
  };
}

const ReceiptScreen: React.FC<ReceiptScreenProps> = ({ navigation, route }) => {
  const { transactionId } = route.params;
  const [transaction, setTransaction] = useState<SalesTransaction | null>(null);
  const [receiptText, setReceiptText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    loadTransaction();
  }, [loadTransaction]);

  const loadTransaction = useCallback(async () => {
    setIsLoading(true);
    try {
      // First try to load from local storage
      const localTransactions = await AsyncStorage.getItem('sales_transactions');
      let foundTransaction = null;
      
      if (localTransactions) {
        const parsed = JSON.parse(localTransactions);
        foundTransaction = parsed.find((t: SalesTransaction) => t.id === transactionId);
      }
      
      // If not found locally, try Supabase
      if (!foundTransaction) {
        const { data, error } = await supabase
          .from('sales')
          .select('*')
          .eq('id', transactionId)
          .single();

        if (error || !data) {
          throw new Error('Transaction not found');
        }
        foundTransaction = data;
      }

      setTransaction(foundTransaction);
      
      // Generate receipt text
      const receiptData: ReceiptData = {
        sale_id: foundTransaction.id,
        date: foundTransaction.created_at,
        items: foundTransaction.items.map((item: { product_name?: string; quantity: number; unit_price: number; total_price: number }) => ({
          name: item.product_name || 'Unknown Product',
          quantity: item.quantity,
          unit_price: item.unit_price / 100, // Convert from pence to pounds
          total_price: item.total_price / 100, // Convert from pence to pounds
        })),
        subtotal: foundTransaction.total / 100, // Convert from pence to pounds
        tax: 0, // TODO: Add tax calculation
        total: foundTransaction.total / 100, // Convert from pence to pounds
        payment_method: foundTransaction.payment_method || 'Unknown',
        customer_name: foundTransaction.customer_name,
        customer_email: foundTransaction.customer_email,
        customer_phone: foundTransaction.customer_phone,
        notes: foundTransaction.notes,
      };

      const receipt = generateReceipt(receiptData);
      setReceiptText(receipt);
    } catch (error) {
      console.error('Failed to load transaction:', error);
      Alert.alert('Error', 'Failed to load receipt details');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  }, [transactionId, navigation]);

  const shareReceipt = async (format: 'text' | 'html' = 'text') => {
    if (!transaction) return;

    setIsSharing(true);
    try {
      const receiptData: ReceiptData = {
        sale_id: transaction.id,
        date: transaction.created_at,
        items: transaction.items.map((item: { product_name?: string; quantity: number; unit_price: number; total_price: number }) => ({
          name: item.product_name || 'Unknown Product',
          quantity: item.quantity,
          unit_price: item.unit_price / 100,
          total_price: item.total_price / 100,
        })),
        subtotal: transaction.total / 100,
        tax: 0,
        total: transaction.total / 100,
        payment_method: transaction.payment_method || 'Unknown',
        customer_name: transaction.customer_name,
        customer_email: transaction.customer_email,
        customer_phone: transaction.customer_phone,
        notes: transaction.notes,
      };

      let content: string;
      let fileName: string;
      let mimeType: string;

      if (format === 'html') {
        content = generateReceiptHTML(receiptData);
        fileName = `receipt_${transaction.id.slice(0, 8)}.html`;
        mimeType = 'text/html';
      } else {
        content = receiptText;
        fileName = `receipt_${transaction.id.slice(0, 8)}.txt`;
        mimeType = 'text/plain';
      }

      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(fileUri, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType,
          dialogTitle: 'Share Receipt',
        });
      } else {
        Alert.alert('Export Complete', `Receipt saved as: ${fileName}`);
      }
    } catch (error) {
      console.error('Failed to share receipt:', error);
      Alert.alert('Share Failed', 'Failed to share receipt');
    } finally {
      setIsSharing(false);
    }
  };

  const reprintReceipt = () => {
    Alert.alert(
      'Reprint Receipt',
      'Choose format for reprinting:',
      [
        { text: 'Text Format', onPress: () => shareReceipt('text') },
        { text: 'HTML Format', onPress: () => shareReceipt('html') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading receipt...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!transaction) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={48} color="#FF3B30" />
          <Text style={styles.errorText}>Receipt not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#007AFF" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Receipt</Text>
        <TouchableOpacity
          onPress={reprintReceipt}
          style={styles.printButton}
          disabled={isSharing}
        >
          <Icon name="print" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.receiptContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.receiptContent}>
          <Text style={styles.receiptText}>{receiptText}</Text>
        </View>
      </ScrollView>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.shareButton]}
          onPress={() => shareReceipt('text')}
          disabled={isSharing}
        >
          <Icon name="share" size={20} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Share Text</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.htmlButton]}
          onPress={() => shareReceipt('html')}
          disabled={isSharing}
        >
          <Icon name="code" size={20} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Export HTML</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  printButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 18,
    color: '#FF3B30',
    marginTop: 16,
    marginBottom: 24,
  },
  receiptContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  receiptContent: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
  },
  receiptText: {
    fontFamily: 'Courier',
    fontSize: 12,
    lineHeight: 16,
    color: '#1C1C1E',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F2F2F7',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  shareButton: {
    backgroundColor: '#34C759',
  },
  htmlButton: {
    backgroundColor: '#007AFF',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ReceiptScreen;