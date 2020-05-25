import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Customer from '@modules/customers/infra/typeorm/entities/Customer';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IFindProducts {
  id: string;
}

interface IProduct {
  product_id: string;
  price: number;
  quantity: number;
}

interface IProductRequest {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProductRequest[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.findCustomer(customer_id);

    const orderProducts = await this.findOrderProducts(products);

    const order = await this.ordersRepository.create({
      customer,
      products: orderProducts,
    });

    await this.productsRepository.updateQuantity(products);

    return order;
  }

  private async findCustomer(customer_id: string): Promise<Customer> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer not found');
    }

    return customer;
  }

  private async findOrderProducts(
    products: IProductRequest[],
  ): Promise<IProduct[]> {
    const productsId = products.map(
      product => ({ id: product.id } as IFindProducts),
    );

    const findProducts = await this.productsRepository.findAllById(productsId);

    if (!findProducts) {
      throw new AppError('No Products found');
    }

    if (productsId.length !== findProducts.length) {
      throw new AppError('There is invalid products id on order list');
    }

    return products.map(product => {
      const findProduct = findProducts.find(item => item.id === product.id);

      if(findProduct && product.quantity > findProduct.quantity){
        throw new AppError(`Insufficient product ${product.id} quantity to create the order`)
      }

      return {
        product_id: product.id,
        price: findProduct?.price,
        quantity: product.quantity,
      } as IProduct;
    });
  }
}

export default CreateOrderService;
