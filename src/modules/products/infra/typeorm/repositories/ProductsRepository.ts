import { getRepository, Repository, In } from 'typeorm';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICreateProductDTO from '@modules/products/dtos/ICreateProductDTO';
import IUpdateProductsQuantityDTO from '@modules/products/dtos/IUpdateProductsQuantityDTO';
import AppError from '@shared/errors/AppError';
import Product from '../entities/Product';

interface IFindProducts {
  id: string;
}

class ProductsRepository implements IProductsRepository {
  private ormRepository: Repository<Product>;

  constructor() {
    this.ormRepository = getRepository(Product);
  }

  public async create({
    name,
    price,
    quantity,
  }: ICreateProductDTO): Promise<Product> {
    const product = this.ormRepository.create({
      name,
      price,
      quantity,
    });

    await this.ormRepository.save(product);

    return product;
  }

  public async findByName(name: string): Promise<Product | undefined> {
    const product = await this.ormRepository.findOne({
      where: {
        name: name
      },
    });

    return product;
  }

  public async findAllById(productsIds: IFindProducts[]): Promise<Product[]> {
    const products = await this.ormRepository.find({
      where: {
        id: In(productsIds.map(product => product.id))
      }
    });

    return products;
  }

  public async updateQuantity(
    products: IUpdateProductsQuantityDTO[],
  ): Promise<Product[]> {

    const productsIds = products.map(product => ({id: product.id} as IFindProducts));

    const productsList = await this.findAllById(productsIds);

    const productPromises = productsList.map(product => {

      const findProduct = products.find(item => item.id === product.id);

      if(! findProduct){
        throw new Error('Product not found to update the quantity');
      }

      product.quantity -= findProduct.quantity;

      return this.ormRepository.save(product);
    });

    const updateProducts = await Promise.all(productPromises);

    return updateProducts;
  }
}

export default ProductsRepository;
